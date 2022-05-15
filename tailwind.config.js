module.exports = {
	mode: "jit",
	purge: [
		"./public/**/*.html",
	 	"./public/**/*.js",
		"./views/**/*.ejs"


	],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
