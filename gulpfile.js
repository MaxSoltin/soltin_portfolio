let preprocessor = 'sass',
	fileswatch = 'html,htm,txt,json,md,woff2',
	baseDir = 'src',
	online = true,
	open = true

const { src, dest, parallel, series, watch } = require('gulp')

const bssi = require('browsersync-ssi')
const ssi = require('ssi')

const sass = require('gulp-sass')(require('sass'))
const gcmq = require('gulp-group-css-media-queries')

const csso = require('gulp-csso')
const cssbeautify = require('gulp-cssbeautify')

const autoprefixer = require('gulp-autoprefixer')
const browserSync = require('browser-sync').create()

const webpack = require('webpack')
const webpackStream = require('webpack-stream')
const TerserPlugin = require('terser-webpack-plugin')

const concat = require('gulp-concat')
const uglify = require('gulp-uglify-es').default

//const exec          = require('gulp-exec');

const rename = require('gulp-rename')
const del = require('del')

function browsersync() {
	browserSync.init({
		server: {
			baseDir: baseDir + '/',
			middleware: bssi({ baseDir: 'src/', ext: '.html' }),
		},
		notify: false,
		open: open,
		online: online,
	})
}


function scripts() {
	return src(['src/js/modules/libs.js', 'src/js/modules/**.js', 'src/js/modules/common.js', '!src/js/jquery.js'])
		.pipe(
			webpackStream({
					mode: 'production',
					performance: { hints: false },
					module: {
						rules: [
							{
								test: /\.m?js$/,
								exclude: /(node_modules)/,
								use: {
									loader: 'babel-loader',
									options: {
										presets: ['@babel/preset-env'],
										plugins: ['babel-plugin-root-import'],
									},
								},
							},
						],
					},
					optimization: {
						minimize: true,
						minimizer: [
							new TerserPlugin({
								terserOptions: { format: { comments: false } },
								extractComments: false,
							}),
						],
					},
				},
				webpack
			)
		)
		.on('error', function handleError() {
			this.emit('end')
		})
		.pipe(concat('scripts.min.js'))
		.pipe(dest('src/js'))
		.pipe(browserSync.stream())
}

function styles() {
	return src('src/scss/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gcmq())
		.pipe(csso())
		.pipe(cssbeautify())
		.pipe(autoprefixer({ overrideBrowserslist: ['last 15 versions'], grid: true }))
		.pipe(dest('src/css'))
		.pipe(browserSync.stream())
}

function cssmin() {
	return src('src/css/main.css')
		.pipe(csso())
		.pipe(rename({ suffix: '.min' }))
		.pipe(dest('src/css'))
		.pipe(browserSync.stream())
}

function startwatch() {
	watch(baseDir + '/**/scss/**/*', series(styles, cssmin))
	watch(['src/js/**/*.js', '!src/js/**/*.min.js'], scripts)
	watch(baseDir + '/**/*.{' + fileswatch + '}').on('change', browserSync.reload)
}

function reactModules() {
	return src('src/scss/modules/*.scss')
		.pipe(
			rename(function (path) {
				path.basename = path.basename.replace(/\_/g, '')
			})
		)
		.pipe(sass().on('error', sass.logError))
		.pipe(gcmq())
		.pipe(csso())
		.pipe(cssbeautify())
		.pipe(autoprefixer({ overrideBrowserslist: ['last 15 versions'], grid: true }))
		.pipe(rename({ suffix: '.module' }))
		.pipe(dest('dist/css/modules'))
}

function clearDist() {
	return del('dist/**/*', { force: true })
}

async function buildhtml() {
	let partials = new ssi('src/', 'dist/', '/**/*.html')
	partials.compile()
	del('dist/partials', { force: true })
}

function buildCopy() {
	return (
		src(baseDir + '/css/*.css').pipe(dest('dist/css')),
		src(baseDir + '/fonts/**/*').pipe(dest('dist/fonts')),
		src(baseDir + '/img/**/*').pipe(dest('dist/img')),
		src(baseDir + '/images/**/*').pipe(dest('dist/images')),
		src(baseDir + '/*.html').pipe(dest('dist')),
		src(baseDir + '/js/modules/*.js')
			.pipe(dest('dist/js/modules/')),
		src(baseDir + '/js/scripts.min.js').pipe(dest('dist/js'))
	)
}

exports.browsersync = browsersync
exports.styles = styles

exports.cssmin = cssmin
exports.reactModules = reactModules

exports.scripts = scripts

exports.build = series(clearDist, scripts, buildCopy, reactModules, buildhtml)

exports.default = parallel(series(styles, cssmin), scripts, browsersync, startwatch)
