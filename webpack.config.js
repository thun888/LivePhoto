// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    // mode: "development",
    mode: "production",
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist',
        library: {
            name: 'LivePhoto', // 你在全局访问时的变量名
            type: 'umd',       // 支持多种引入方式
            // export: 'default', // 直接指向 default 导出
        }
    },
    // plugins: [
    //     new BundleAnalyzerPlugin()
    // ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false, // 不生成 .LICENSE.txt 文件
                terserOptions: {
                    compress: {
                        drop_console: true, // 移除 console.log
                        drop_debugger: true, // 移除 debugger
                    },
                },
            }),
            new CssMinimizerPlugin(), // 压缩 CSS
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].css",
        }),
        new CssMinimizerPlugin(),
        new TerserPlugin()
    ],
    module: {
        noParse: /libheif-bundle\.js$/,
        rules: [
            {
                test: /\.css$/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
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
                type: 'asset', // 自动在 resource 和 inline 之间切换
                parser: {
                dataUrlCondition: {
                    // 设定阈值：小于 8kb 的图片会被转为 base64 内联到代码中
                    maxSize: 8 * 1024 
                }
                },
                generator: {
                // 如果超过 8kb，输出到 images 文件夹，并保持原名和 hash 避免缓存冲突
                filename: 'images/[name].[hash:8][ext]'
                }
            }
        ]
    }
};