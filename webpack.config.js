const path = require('path');
const Dotenv = require('dotenv-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

module.exports = {
    entry: './js/main.js',
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
                    from: 'css',
                    to: 'css' 
                },
                { 
                    from: 'assets',
                    to: 'assets' 
                },
                {
                    from: 'CNAME',
                    to: ''
                },
                {
                    from: 'impressum.html',
                    to: ''
                },
                {
                    from: 'datenschutz.html',
                    to: ''
                }
            ]
        })
    ]
}; 