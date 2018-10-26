


cc.Class({
    extends: cc.Component,

    properties: {
        panel: {
            type: cc.Label,
            default: null,
        },
        manifestUrl: {
            type: cc.Asset,
            default: null
        },
        updateBtn:{
            type: cc.Button,
            default: null
        },
        checkBtn:{
            type: cc.Button,
            default: null
        },
        retryBtn:{
            type: cc.Button,
            default: null
        },
        fileLabel:{
            type: cc.Label,
            default: null
        },
        byteLabel:{
            type: cc.Label,
            default: null
        },
        panel:{
            type: cc.Label,
            default: null
        },

        // updateUI: cc.Node,
        _updating: false,
        _canRetry: false,
        _storagePath: ''
    },

    checkCb: function (event) {
        cc.log('Code: ' + event.getEventCode());
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.panel.string = "No local manifest file found, hot update skipped.";
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.panel.string = "Fail to download manifest file, hot update skipped.";
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.panel.string = "Already up to date with the latest remote version.";
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                this.panel.string = 'New version found, please try to update.';
                this.checkBtn.node.active = false;
                this.retryBtn.node.active = false;
                this.updateBtn.node.active = true;
                // this.panel.fileProgress.progress = 0;
                // this.panel.byteProgress.progress = 0;
                break;
            default:
                return;
        }
        
        this._am.setEventCallback(null);
        this._checkListener = null;
        this._updating = false;
    },

    updateCb: function (event) {
        var needRestart = false;
        var failed = false;
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                this.panel.string = 'No local manifest file found, hot update skipped.';
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                // this.panel.byteProgress.progress = event.getPercent();
                // this.panel.fileProgress.progress = event.getPercentByFile();

                this.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                this.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();

                var msg = event.getMessage();
                if (msg) {
                    this.panel.string = 'Updated file: ' + msg;
                    // cc.log(event.getPercent()/100 + '% : ' + msg);
                }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                this.panel.string = 'Fail to download manifest file, hot update skipped.';
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                this.panel.string = 'Already up to date with the latest remote version.';
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                this.panel.string = 'Update finished. ' + event.getMessage();
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                this.panel.string = 'Update failed. ' + event.getMessage();
                this.retryBtn.node.active = true;
                this._updating = false;
                this._canRetry = true;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                this.panel.string = 'Asset update error: ' + event.getAssetId() + ', ' + event.getMessage();
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                this.panel.string = event.getMessage();
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null);
            this._updateListener = null;
            this._updating = false;
        }

        if (needRestart) {
            this._am.setEventCallback(null);
            this._updateListener = null;
            // Prepend the manifest's search path
            var searchPaths = jsb.fileUtils.getSearchPaths();
            var newPaths = this._am.getLocalManifest().getSearchPaths();
            console.log(JSON.stringify(newPaths));
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);

            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    },

    // loadCustomManifest: function () {
    //     if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
    //         var manifest = new jsb.Manifest(customManifestStr, this._storagePath);
    //         this._am.loadLocalManifest(manifest, this._storagePath);
    //         this.panel.info.string = 'Using custom manifest';
    //     }
    // },
    
    retry: function () {
        cc.log('------->retry');
        if (!this._updating && this._canRetry) {
            this.retryBtn.node.active = false;
            this._canRetry = false;
            
            this.panel.string = 'Retry failed Assets...';
            this._am.downloadFailedAssets();
        }
    },
    
    checkUpdate: function () {
        cc.log('------->checkUpdate');
        this.panel.string = 'checkUpdate';
        if (this._updating) {
            this.panel.string = 'Checking or updating ...';
            return;
        }
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            var url = this.manifestUrl.nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            this._am.loadLocalManifest(url);
        }
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
            this.panel.string = 'Failed to load local manifest ...';
            return;
        }
        this._am.setEventCallback(this.checkCb.bind(this));

        this._am.checkUpdate();
        this._updating = true;
    },

    hotUpdate: function () {
        cc.log('------->hotUpdate');
        if (this._am && !this._updating) {
            this.panel.string = 'hotUpdate';
            this._am.setEventCallback(this.updateCb.bind(this));

            if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
                // Resolve md5 url
                var url = this.manifestUrl.nativeUrl;
                if (cc.loader.md5Pipe) {
                    url = cc.loader.md5Pipe.transformURL(url);
                }
                this._am.loadLocalManifest(url);
            }

            this._failCount = 0;
            this._am.update();
            this.updateBtn.node.active = false;
            this._updating = true;
        }
    },
    
    show: function () {
        // if (this.updateUI.active === false) {
        //     this.updateUI.active = true;
        // }
    },

    // use this for initialization
    onLoad: function () {
        // Hot update is only available in Native build
        cc.log('-------> onLoad' );
        this.fileLabel.string = '';
        this.byteLabel.string = '';
        this.panel.string = '';

        if (!cc.sys.isNative) {
            this.checkBtn.node.active = false;
            this.updateBtn.node.active = false;
            this.retryBtn.node.active = false;

            return;
        }
        this.checkBtn.node.active = true;
        this.updateBtn.node.active = false;

        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'blackjack-remote-asset');
        cc.log('Storage path for remote asset : ' + this._storagePath);

        // Setup your own version compare handler, versionA and B is versions in string
        // if the return value greater than 0, versionA is greater than B,
        // if the return value equals 0, versionA equals to B,
        // if the return value smaller than 0, versionA is smaller than B.
        this.versionCompareHandle = function (versionA, versionB) {
            cc.log("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
            var vA = versionA.split('.');
            var vB = versionB.split('.');
            for (var i = 0; i < vA.length; ++i) {
                var a = parseInt(vA[i]);
                var b = parseInt(vB[i] || 0);
                if (a === b) {
                    continue;
                }
                else {
                    return a - b;
                }
            }
            if (vB.length > vA.length) {
                return -1;
            }
            else {
                return 0;
            }
        };

        // Init with empty manifest url for testing custom manifest
        this._am = new jsb.AssetsManager('', this._storagePath, this.versionCompareHandle);

        var panel = this.panel;
        // Setup the verification callback, but we don't have md5 check function yet, so only print some message
        // Return true if the verification passed, otherwise return false
        this._am.setVerifyCallback(function (path, asset) {
            // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
            var compressed = asset.compressed;
            // Retrieve the correct md5 value.
            var expectedMD5 = asset.md5;
            // asset.path is relative path and path is absolute.
            var relativePath = asset.path;
            // The size of asset file, but this value could be absent.
            var size = asset.size;
            if (compressed) {
                panel.string = "Verification passed : " + relativePath;
                return true;
            }
            else {
                panel.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                return true;
            }
        });

        this.panel.string = 'Hot update is ready, please check or directly update.';

        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            this._am.setMaxConcurrentTask(2);
            this.panel.string = "Max concurrent tasks count have been limited to 2";
        }
        
        // this.panel.fileProgress.progress = 0;
        // this.panel.byteProgress.progress = 0;
    },

    onDestroy: function () {
        if (this._updateListener) {
            this._am.setEventCallback(null);
            this._updateListener = null;
        }
    }
});
