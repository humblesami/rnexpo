const { getDefaultConfig: getDefaultExpoConfig } = require('@expo/metro-config');
const { mergeConfig, getDefaultConfig } = require('@react-native/metro-config');

const expoConfig = getDefaultExpoConfig(__dirname);
const defaultConfig = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = expoConfig.resolver;

const config = {
    transformer: {
        ...expoConfig.transformer,
        babelTransformerPath: require.resolve("react-native-svg-transformer/expo")
    },
    resolver: {
        ...expoConfig.resolver,
        assetExts: assetExts.filter((ext) => ext !== "svg"),
        sourceExts: [...sourceExts, "svg"]
    }
};

module.exports = mergeConfig(defaultConfig, expoConfig, config);