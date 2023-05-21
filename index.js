const   express = require('express')
const app = express()
const cors=require("cors")
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');


///midleWere 
app.use(express.json())
app.use(cors())





// Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "mainImage") {
      cb(null, "uploads/main-images/");
    } else if (file.fieldname === "subImages") {
      cb(null, "uploads/sub-images/");
    } else if (file.fieldname === "pdfFile") {
      cb(null, "uploads/pdf-files/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});

const upload = multer({ storage });

///conncect mongodb

// re9jTYZ8BjknXtHT
// kbHome

const uri =
  "mongodb+srv://kbHome:re9jTYZ8BjknXtHT@softopark.ockrkce.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
});

async function run() {
  try {
    const userCollection = client.db("KB").collection("users");

    //register
    app.post(
      "/register",
      upload.fields([
        { name: "userPhoto", maxCount: 1 },
        { name: "nidCardImg", maxCount: 1 }
      ]),
      async (req, res) => {
        try {
          const { name, email, password, phoneNumber } = req.body;

          const existingUser = await userCollection.findOne({ email });

          if (existingUser) {
            return res
              .status(500)
              .json({ message: "Email address already registered" });
          }

          // Insert user data into the "users" collection
          const result = await userCollection.insertOne({
            name,
            email,
            password,
            userPhoto: req.files["userPhoto"]
              ? req.files["userPhoto"][0].path
              : "",
            nidCardImg: req.files["nidCardImg"]
              ? req.files["nidCardImg"][0].path
              : "",
            phoneNumber
          });

          res.status(200).json({ message: "Registration successful" });
        } catch (err) {
          console.error(err);
          res.status(500).json({ message: "Registration failed" });
        }
      }
    );

    //login
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        // Find the user with the given email

        const user = await userCollection.findOne({ email, password });

        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare the provided password with the stored password
        // const passwordMatch = await bcrypt.compare(password, user.password);

        // if (!passwordMatch) {
        //   return res.status(401).json({ message: 'Invalid email or password' });
        // }

        // Authentication successful
        res.status(200).json({ message: "Login successful" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Login failed" });
      }
    });

    app.post(
      "/products",
      upload.fields([
        { name: "mainImage", maxCount: 1 },
        { name: "subImages", maxCount: 10 },
        { name: "pdfFile", maxCount: 1 }
      ]),
      (req, res) => {
        // Process the form data and handle product upload

        // Access the form data
        const name = req.body.name;
        const description = req.body.description;
        const startBiddingPrice = req.body.startBiddingPrice;
        const buyNowPrice = req.body.buyNowPrice;
        const minimumBid = req.body.minimumBid;
        const startBiddingTime = req.body.startBiddingTime;
        const endBiddingTime = req.body.endBiddingTime;

        // Access the uploaded files
        const mainImage = req.files["mainImage"][0];
        const subImages = req.files["subImages"];
        const pdfFile = req.files["pdfFile"][0];

        // Save the product data to MongoDB
        const product = {
          name,
          description,
          startBiddingPrice,
          buyNowPrice,
          minimumBid,
          startBiddingTime,
          endBiddingTime,
          mainImage: mainImage.filename,
          subImages: subImages.map(file => file.filename),
          pdfFile: pdfFile.filename
        };

        const collection = client.db("KB").collection("products");
        collection.insertOne(product, (err, result) => {
          if (err) {
            console.error("Error saving product to MongoDB:", err);
            res
              .status(500)
              .json({ success: false, message: "Error uploading product" });
          } else {
            console.log("Product uploaded successfully");
            res.json({
              success: true,
              message: "Product uploaded successfully"
            });
          }
        });
      }
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => res.send('KB server is going on '))
app.listen(port, () => console.log(`KB  app listening on port ${port}!`))