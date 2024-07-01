const mongoose = require("mongoose")

const blogSchema = new mongoose.Schema({
	id: { type: Number },
	title: { type: String },
	desc: { type: String },
	mainImage: { type: String },
	content: [{
		subheading: { type: String },
		p: [{ type: String }],
		image: { type: String }
	}
	]

})

module.exports = mongoose.model("Blog", blogSchema)