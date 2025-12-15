import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.secontaf.mrssigma',
  appName: 'MRS-SIGMA',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
    iosScheme: 'capacitor'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug',
    minWebViewVersion: 60
  },
  ios: {
    scheme: 'MRS-SIGMA'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#3B82F6",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3B82F6'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true
    },
    Network: {
      alias: 'Network'
    },
    Geolocation: {
      permissions: {
        location: "always"
      }
    },
    Camera: {
      permissions: {
        camera: "camera",
        photos: "photos"
      }
    },
    Filesystem: {
      alias: 'Filesystem'
    },
    Preferences: {
      alias: 'Preferences'
    },
    Haptics: {
      alias: 'Haptics'
    }
  }
};

export default config;