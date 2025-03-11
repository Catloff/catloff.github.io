const path = require('path');
const Dotenv = require('dotenv-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

module.exports = {
    entry: './js/firebase.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new Dotenv(),
        new CopyWebpackPlugin({
            patterns: [
                { 
                    from: 'index.html',
                    to: '',
                    transform(content) {
                        return content.toString().replace(/%(.+)%/g, (match, p1) => {
                            return process.env[p1] || match;
                        });
                    }
                },
                { 
                    from: 'admin.html',
                    to: '',
                    transform(content) {
                        return content.toString().replace(/%(.+)%/g, (match, p1) => {
                            return process.env[p1] || match;
                        });
                    }
                },
                { 
                    from: 'css',
                    to: 'css' 
                },
                { 
                    from: 'assets',
                    to: 'assets' 
                },
                {
                    from: 'js',
                    to: 'js',
                    globOptions: {
                        ignore: ['**/firebase.js'] // Ignoriere firebase.js da es bereits gebündelt wird
                    }
                },
                {
                    from: 'CNAME',
                    to: ''
                }
            ]
        })
    ]
}; 