const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const morgan = require("morgan")
require("dotenv").config()
const app = express()
const multer = require("multer");
const Blog = require("./models/blogs")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");


app.use(cors())
app.use(morgan("dev"))
app.use(express.json())


const s3 = new S3Client({
	region: process.env.BUCKET_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_WORK,
		secretAccessKey: process.env.AWS_SECRET_KEY_WORK,
	},
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const connectDB = async () => {
	try {
		mongoose
			.connect(
				"mongodb+srv://vaishali:vaishali@cluster0.xpn05jl.mongodb.net/gandifile?retryWrites=true&w=majority"
			)
			.then(() => {
				console.log("DB is connected");
			});
	} catch (err) {
		console.log(err);
	}
};

connectDB();

app.get("/blog/:id", async (req, res) => {
	try {
		const { id } = req.params
		const blog = await Blog.findOne({ id })
		res.status(200).json({ success: true, blog, url: process.env.PICURL })
	} catch (error) {
		res.status(400).json({ success: false })
		console.log(error)
	}
})


app.get("/v1/blog/:mongoid", async (req, res) => {
	try {
		const { mongoid } = req.params
		const blog = await Blog.findById(mongoid)
		res.status(200).json({ success: true, blog, url: process.env.PICURL })
	} catch (error) {
		res.status(400).json({ success: false })
		console.log(error)
	}
})

app.post("/postblogs", upload.any(), async (req, res) => {
	try {
		const { title, desc, content: rawContent } = req.body
		const files = req.files;
		const content = JSON.parse(rawContent);

		const contentImages = req.files.filter((d) => d?.fieldname === "contentImage")

		console.log(contentImages)

		let mainImage = ""

		const mainImageFile = files.find(file => file.fieldname === "mainImage");
		if (mainImageFile) {
			const uuidString = uuidv4();
			const objectName = `${Date.now()}_${uuidString}_${mainImageFile?.originalname}`;
			const params = {
				Bucket: process.env.WORKSPACE_BUCKET,
				Key: objectName,
				Body: mainImageFile?.buffer,
				ContentType: mainImageFile?.mimetype,
			};

			const command = new PutObjectCommand(params);
			await s3.send(command);
			mainImage = objectName
		}

		for (let i = 0; i < content.length; i++) {
			if (content[i].files) {

				const uuidString = uuidv4();
				const objectName = `${Date.now()}_${uuidString}`;
				const params = {
					Bucket: process.env.WORKSPACE_BUCKET,
					Key: objectName,
					Body: contentImages[i]?.buffer,
					ContentType: contentImages[i]?.mimetype,
				};

				const command = new PutObjectCommand(params);
				await s3.send(command);
				content[i].image = objectName;

			} else {
				content[i].image = "";
			}
		}

		const number = await Blog.countDocuments()

		const blogs = new Blog({
			id: number + 1,
			title,
			desc,
			mainImage: mainImage ? mainImage : null,
			content,
		})
		await blogs.save()

		res.status(200).json({ success: true, message: "Blog Created!" })
	} catch (error) {
		console.log(error)
		res.status(400).json({ success: false })
	}
})


app.listen(8000, () => {
	console.log('Server started on port 8000');
});

