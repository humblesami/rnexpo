## Environemnt setup versions

NodeJs 20
JAVA 17
expo-cli 6.3.10

yarn create expo-app com.moweb
yarn web
yarn expo prebuild

buildToolsVersion = '34.0.0'
minSdkVersion = '23'
compileSdkVersion = '34'
targetSdkVersion = '34'
kotlinVersion = '1.9.23'
ndkVersion = "26.1.10909125"

Android gradle plugin: 8.2.1
Gradle: 8.8

## RUN Without Expo on android

added metro.config.js to root
yarn add @react-native/metro-config

export NODE_ENV=development
npx react-native run-android
npx react-native start

## Run and build with expo

npx expo run:android

To run without expo, Make Build With EAS

npx expo run:android
CommandError: No development build (com.moweb) for this project is installed. Please make and install a development build on the device first.

npx expo install expo-dev-client

added eas.json to root

npm install -g eas-clis
eas build --profile development --platform android
