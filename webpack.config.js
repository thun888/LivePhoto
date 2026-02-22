// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

const terserPlugin = new TerserPlugin({
    extractComments: false, // 不生成 .LICENSE.txt 文件
    terserOptions: {
        compress: {
            drop_console: true,  // 移除 console.log
            drop_debugger: true, // 移除 debugger
        },
    },
});

const moduleRules = {
    noParse: /libheif-bundle\.js$/,
    rules: [
        {
            test: /\.css$/i,
            use: [MiniCssExtractPlugin.loader, 'css-loader']
        },
        {
            test: /\.svg$/,
            type: 'asset',
            parser: {
                dataUrlCondition: {
                    maxSize: 8 * 1024 // 小于 8kb 的 SVG 会被内联
                }
            }
        },
        {
            test: /\.(png|jpg|jpeg|gif)$/i,
            type: 'asset',
            parser: {
                dataUrlCondition: {
                    maxSize: 8 * 1024 // 小于 8kb 的图片转为 base64
                }
            },
            generator: {
                filename: 'images/[name].[hash:8][ext]'
            }
        }
    ]
};

const commonOptimization = {
    minimize: true,
    minimizer: [terserPlugin, new CssMinimizerPlugin()],
};

const libraryOutput = {
    name: 'LivePhoto',
    type: 'umd',
};

/** 配置一：保持分包（动态 import 产生独立 chunk） */
const splitConfig = {
    mode: "production",
    entry: './src/index.js',
    output: {
        filename: 'main.js',
        chunkFilename: '[name].chunk.js',
        path: __dirname + '/dist',
        library: libraryOutput,
    },
    optimization: commonOptimization,
    plugins: [
        new MiniCssExtractPlugin({ filename: "main.css" }),
    ],
    module: moduleRules,
};

/** 配置二：全量打包（所有 chunk 合并进单文件 bundle.js） */
const bundleConfig = {
    mode: "production",
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist',
        library: libraryOutput,
    },
    optimization: {
        ...commonOptimization,
        // 禁用 chunk 分割，所有模块合并进主文件
        splitChunks: false,
    },
    plugins: [
        new MiniCssExtractPlugin({ filename: "main.css" }), // CSS 共用同一输出
        // 强制将所有动态 chunk 合并进主 bundle
        new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
    module: moduleRules,
};

module.exports = [splitConfig, bundleConfig];