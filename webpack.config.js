const path = require('path');

module.exports = {
    mode: 'development',
    entry: './js/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/'
    },
    devtool: 'source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, '/'),
        },
        hot: true,
        open: true,
        historyApiFallback: true,
        port: 8080
    },
    optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
    },
    cache: {
        type: 'filesystem'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        cacheDirectory: true
                    }
                }
            }
        ]
    }
}; 