const express = require("express");
const app = express();
var cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");

///midleWere
app.use(cors());
app.use(express.json());

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "mainImage") {
      cb(null, "uploads/main-images/");
    } else if (file.fieldname === "userPhoto") {
      cb(null, "uploads/user-photos/");
    } else if (file.fieldname === "nidCardImg") {
      cb(null, "uploads/nid-card-images/");
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
    const productCollection = client.db("KB").collection("products");

    //register
    app.post(
      "/register",
      upload.fields([
        { name: "userPhoto", maxCount: 1 },
        { name: "nidCardImg", maxCount: 1 }
      ]),
      async (req, res) => {
        try {
          const {
            businessName,
            businessAddress,
            tinNum,
            tradeLN,
            name,
            email,
            password,
            phoneNumber
          } = req.body;

          const existingUser = await userCollection.findOne({ email });

          if (existingUser) {
            return res
              .status(500)
              .json({ message: "Email address already registered" });
          }

          // Insert user data into the "users" collection
          const result = await userCollection.insertOne({
            businessName,
            businessAddress,
            tinNum,
            tradeLN,
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

        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(401).json({ message: "Invalid email  " });
        }
        res.status(200).json({ message: "Login successful" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Login failed" });
      }
    });
    ///upload   product
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
        const {
          name,
          description,
          startBiddingPrice,
          buyNowPrice,
          minimumBid,
          startBiddingTime,
          endBiddingTime
        } = req.body;

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
          pdfFile: pdfFile.filename,
          bids: []
        };

        productCollection.insertOne(product, (err, result) => {
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

    ///get  singel user
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // get all  product
    app.get("/products", async (req, res) => {
      const result = await productCollection.find({}).toArray();
      res.send(result);
    });
    //get singel product
    app.get("/products/:id", async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
    ///place bid
    app.post("/products/:productId/bids", async (req, res) => {
      try {
        const { productId } = req.params;
        const {
          bidAmount,
          bidderName,
          bidderId,
          bidderEmail,
          bidderNumber,
          bidderPhoto,
          productName,
          productPhoto
        } = req.body;

        // Find the product by its ID in the database
        const product = await productCollection.findOne({
          _id: new ObjectId(productId)
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if bidding is still open
        const currentTime = new Date().getTime();
        const biddingEndTime = new Date(product.endBiddingTime).getTime();
        if (currentTime > biddingEndTime) {
          return res.status(400).json({ error: "Bidding has ended" });
        }

        // Check if bid amount is greater than the current highest bid
        const currentHighestBid = product.bids.reduce(
          (maxBid, bid) => (bid.amount > maxBid ? bid.amount : maxBid),
          0
        );

        // Calculate the minimum bid amount
        const minimumBid = parseFloat(product.minimumBid);
        console.log(currentHighestBid + minimumBid);

        // Check if new bid amount is lower than current bid price plus minimum bid
        if (bidAmount < currentHighestBid + minimumBid) {
          return res.status(400).json({
            error:
              "New price cannot be lower than the current bid price plus the minimum bid amount."
          });
        }

        // Update the product with the new bid
        const newBid = {
          amount: bidAmount,
          bidderName: bidderName,
          bidderId: bidderId,
          bidderEmail,
          bidderNumber,
          bidderPhoto,
          productName,
          productPhoto,
          timestamp: new Date().toISOString()
        };

        product.bids.push(newBid);

        await productCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: product }
        );

        res
          .status(201)
          .json({ message: "Bid placed successfully", bid: newBid });
      } catch (error) {
        res.status(500).json({ error: "Error placing bid" });
      }
    });

    //get winner
    app.get("/products/:productId/winner", async (req, res) => {
      try {
        const { productId } = req.params;

        // Find the product by its ID in the database
        const product = await productCollection.findOne({
          _id: new ObjectId(productId)
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if any bids exist for the product
        if (product.bids.length === 0) {
          return res
            .status(400)
            .json({ error: "No bids found for the product" });
        }

        // Find the bid with the highest amount
        const highestBid = product.bids.reduce((maxBid, bid) =>
          bid.amount > maxBid.amount ? bid : maxBid
        );

        // Check if the current time is greater than the bidding end time
        const currentTime = new Date().getTime();
        const biddingEndTime = new Date(product.endBiddingTime).getTime();

        if (currentTime >= biddingEndTime) {
          // Bidding has ended, return the winner
          const winner = highestBid;

          return res
            .status(200)
            .json({ winner: winner, amount: highestBid.amount });
        }

        // // Bidding is still ongoing, return a message indicating bidding is not closed yet
        // res.status(200).json({ message: "Bidding is still ongoing" });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winner" });
      }
    });

    //get my all bids

    app.get("/bids/bidder/:bidderId/products", async (req, res) => {
      try {
        const { bidderId } = req.params;

        // Find all products that have bids from the bidder
        const products = await productCollection
          .find({
            "bids.bidderId": bidderId
          })
          .toArray();

        res.status(200).json({ products });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving bidder's products" });
      }
    });

    ///get my  win bids

    app.get("/bids/bidder/:bidderId/products/won", async (req, res) => {
      try {
        const { bidderId } = req.params;

        // Find all products where the bidder has the highest bid
        const products = await productCollection
          .aggregate([
            {
              $match: {
                "bids.bidderId": bidderId
              }
            },
            {
              $unwind: "$bids"
            },
            {
              $sort: {
                "bids.amount": -1
              }
            },
            {
              $group: {
                _id: "$_id",
                product: { $first: "$$ROOT" },
                highestBid: { $first: "$bids" }
              }
            },
            {
              $project: {
                _id: "$product._id",
                name: "$product.name",
                description: "$product.description",
                // Add other product fields you want to retrieve
                highestBid: "$highestBid"
              }
            }
          ])
          .toArray();

        res.status(200).json({ wonProducts: products });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving won products" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/", (req, res) => res.send("KB server is going on "));
app.listen(port, () => console.log(`KB  app listening on port ${port}!`));
