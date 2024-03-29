/**
 * Notes:
 *
 * ts-loader was not used because it did not correctly recompile changed files. Instead we use `tsc -b` as a separate
 * build step that gets mapped to the build/generated folder which webpack then bundles.
 */

const projectName = "app"

const webpack = require("webpack")
const path = require("path")
const fs = require("fs")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")

const prodConfig = {
    mode: "production",
    target: "web",
    entry: {
        main: { import: "./build/generated/index.js" },
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
        alias: {
            lib: path.resolve(__dirname, "build/generated/lib"),
            model: path.resolve(__dirname, "build/generated/model"),
            service: path.resolve(__dirname, "build/generated/service"),
            interactor: path.resolve(__dirname, "build/generated/interactor"),
            ui: path.resolve(__dirname, "build/generated/ui"),
            static: path.resolve(__dirname, "static"),
        },
    },
    output: {
        filename: `${projectName}.[name].js`,
        path: path.resolve(__dirname, "build/dist"),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: {
                    loader: "source-map-loader",
                    options: {
                        filterSourceMappingUrl: (url, resourcePath) => !/node_modules/.test(resourcePath),
                    },
                },
            },
            {
                test: /\.s?css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
            },
        ],
    },
    plugins: [
        {
            apply: (compiler) => {
                // Clean `./build/dist` folder
                compiler.hooks.beforeRun.tap(`${projectName}-PreEmit`, (compilation) => {
                    fs.rmSync("./build/dist", { recursive: true, force: true })
                    fs.mkdirSync("./build/dist")
                })
            },
        },
        new MiniCssExtractPlugin(),
        new webpack.WatchIgnorePlugin({
            paths: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        }),
        new CopyWebpackPlugin({
            patterns: [{ from: "./static", to: "./", filter: (path) => !/\.s?css$/.test(path) }],
        }),
    ],
    devtool: "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "build/dist"),
        compress: true,
        port: 80,
        historyApiFallback: {
            index: "index.html",
        },
    },
    optimization: {
        minimize: true,
        minimizer: [`...`, new CssMinimizerPlugin()],
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all",
            maxInitialRequests: Infinity,
            minSize: 0,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendor",
                },
            },
        },
    },
}

const devConfig = {
    ...prodConfig,
    mode: "development",
}

const testConfig = {
    ...prodConfig,
    ...{
        entry: `./build/generated/index.test.ts`,
        mode: "development",
        target: "node",
        output: {
            filename: `${projectName}.test.js`,
            path: path.resolve(__dirname, "build/dist"),
        },
        optimization: {},
    },
}

module.exports = (env) => {
    if (env.prod) {
        return prodConfig
    } else if (env.dev) {
        return devConfig
    } else if (env.test) {
        return testConfig
    }
}
