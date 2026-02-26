const path = require('path');

module.exports = {
    entry: './assets/js/src/index.js',
    output: {
        filename: 'divi-anchor-adapter.js',
        path: path.resolve(__dirname, 'assets/js/dist'),
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
                    },
                },
            },
        ],
    },
};
