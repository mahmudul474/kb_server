const express = require("express");
const app = express();
var cors = require("cors");
const port = process.env.PORT || 5000;
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const path = require("path");

//email send
// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mdmahmudulla474@gmail.com",
    pass: "pfnnszixydqzfkhz"
  }
});

///midleWere
app.use(cors());
app.use(express.json());

///conncect mongodb

// re9jTYZ8BjknXtHT
// kbHome

////veryfyjwt

function veryfyjwt(req, res, next) {
  const authheader = req.headers.authorization;
  if (!authheader) {
    return res.status(401).send("unauthorized");
  }
  const token = authheader.split(" ")[1];

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized" });
    }
    req.decoded = decoded;
    next();
  });
}

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
    const hostRequestsCollection = client.db("KB").collection("hostRequests");

    ///admin veryfy

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "unauthorized" });
      }

      next();
    };

    ///verify Seller

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbiden accees" });
      }
      next();
    };

    //register
    app.post(
      "/registrations",

      async (req, res) => {
        try {
          const user = req.body;

          const existingUser = await userCollection.findOne({
            email: user.email
          });

          if (existingUser) {
            return res
              .status(500)
              .json({ message: "Email address already registered" });
          }

          // Insert user data into the "users" collection
          const result = await userCollection.insertOne(user);

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
        const { email } = req.body;
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

    ///upd  user profile

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;

      console.log(email);
      const info = req.body;
      console.log(info, "api is hittet ");
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name: info.name,
          phoneNumber: info?.phoneNumber,
          userPhoto: info?.userPhoto
        }
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_ACCESS_TOKEN, {
          expiresIn: "1d"
        });

        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    ///get  all  users

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const users = await userCollection.find({}).toArray();
      const result = users.filter(user => user.email !== email);
      res.send(result);
    });

    //make  admin

    app.put("/user/admin/:id", veryfyjwt, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);

      if (user.role !== "admin") {
        return res.status(403).send({ message: "forbidden acces" });
      }

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin"
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    //make   bidder

    app.put("/user/bidder/:id", async (req, res) => {
      const id = req.params.id;
      const { phoneNumber, businessName, businessAddress, tinNum, tradeLN } =
        req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const uptadeDoc = {
        $set: {
          role: "bidder",
          phoneNumber,
          businessName,
          businessAddress,
          tinNum,
          tradeLN
        }
      };

      const result = await userCollection.updateOne(filter, uptadeDoc, options);
      res.send(result);
    });

    //   delete role// disable role

    app.put("/user/disabled/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "disabled"
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      res.json({ result, message: "disabled, successfully" });
    });

    ///delete user

    app.delete("/delete/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.json({ result, message: " deleted successfully" });
    });

    ///send  issues messages
    app.put("/admin/messages/:id", async (req, res) => {
      const id = req.params.id;
      const message = req.body;

      const filter = { _id: new ObjectId(id) };
      const uptadeDoc = {
        $set: {
          message
        }
      };
      const options = { upsert: true };

      const result = await userCollection.updateOne(filter, uptadeDoc, options);
      console.log(result);
      res.send(result);
    });

    // POST request to submit a host request
    app.post("/seller/requests/:email", async (req, res) => {
      const info = req.body;
      const email = req.params.email;

      const alreadeseller = await hostRequestsCollection.findOne({
        email: email
      });
      if (alreadeseller) {
        return res.status(403).send({ message: "already send request" });
      }

      console.log(alreadeseller);

      const result = await hostRequestsCollection.insertOne({
        info,
        email,
        status: "pending"
      });
      res.json({ result, message: "seller request successfully sent" });
    });

    // GET request to retrieve all host requests
    app.get("/admin/host-requests", async (req, res) => {
      const result = await hostRequestsCollection.find({}).toArray();
      res.send(result);
    });

    //appove  admin my seller request
    app.put("/admin/sellerRequests/approve/:email", async (req, res) => {
      console.log("api ius hit");
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const uptadeDoc = {
        $set: {
          status: "approved"
        }
      };

      userCollection.updateOne(
        { email: email },
        { $set: { role: "seller" } },
        err => {
          if (err) {
            console.error("Failed to update user role:", err);
            return res
              .status(500)
              .json({ error: "Failed to approve host request." });
          }
        }
      );

      const result = await hostRequestsCollection.updateOne(
        filter,
        uptadeDoc,
        options
      );
      res.send(result);
    });

    /// delete seller

    app.delete("/deleteseller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log("api deE");

      userCollection.updateOne(
        { email: email },
        { $set: { role: "" } },
        err => {
          if (err) {
            console.error("Failed to update user role:", err);
            return res
              .status(500)
              .json({ error: "Failed to approve host request." });
          }
        }
      );

      const result = await hostRequestsCollection.deleteOne(query);

      res.json({ result, message: " deleted seller  request " });
    });

    /// get my   request
    app.get("/user/my-request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await hostRequestsCollection.findOne(query);
      res.send(result);
    });

    //perticuller  user admin
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    ///get  singel user
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    ///upload   product
    app.post("/products", async (req, res) => {
      try {
        const product = req.body;

        // Insert the product into the product collection
        await productCollection.insertOne(product);

        // Send success message
        res.status(200).json({ message: "Product  upload  successfully" });
      } catch (error) {
        // Send error message
        res.status(500).json({ message: "  product not  upload " });
      }
    });

    // get all  product
    app.get("/products", async (req, res) => {
      const result = await productCollection.find({}).toArray();
      res.send(result);
    });

    ///admin  uptade a product

    app.put("/product/update/:id", async (req, res) => {
      const id = req.params.id;
      const {
        name,
        description,
        startBiddingPrice,
        buyNowPrice,
        minimumBid,
        startBiddingTime,
        endBiddingTime
      } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name,
          description,
          startBiddingPrice,
          buyNowPrice,
          minimumBid,
          startBiddingTime,
          endBiddingTime
        }
      };

      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json({ result, message: "product updated successfully" });
    });

    // admin delete  product

    app.delete("/products/admin/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.json({ result, message: "  deleted product successfully" });
    });

    // all products get  bidding end

    app.get("/products/closed-bids/with-bids", async (req, res) => {
      try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const hours = String(currentDate.getHours()).padStart(2, "0");
        const minutes = String(currentDate.getMinutes()).padStart(2, "0");

        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

        const products = await productCollection
          .find({
            endBiddingTime: { $lt: formattedDate }
          })
          .toArray();

        const result = products.filter(
          product => product.bids.length !== 0 || product.bids.length > 0
        );
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    //check  kore dekte paro

    // app.get("/products/with-bids", async (req, res) => {
    //   try {
    //     const currentDate = new Date();
    //     const year = currentDate.getFullYear();
    //     const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    //     const day = String(currentDate.getDate()).padStart(2, "0");
    //     const hours = String(currentDate.getHours()).padStart(2, "0");
    //     const minutes = String(currentDate.getMinutes()).padStart(2, "0");

    //     const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    //     // Find all products that have bids
    //     const products = await productCollection
    //       .find({ bids: { $exists: true, $not: { $size: 0 } } })
    //       .toArray();
    //   } catch (error) {
    //     res.status(500).json({ error: "Error retrieving products" });
    //   }
    // });

    //bidding end but never bid

    app.get("/products/no-bids-end-time", async (req, res) => {
      try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const hours = String(currentDate.getHours()).padStart(2, "0");
        const minutes = String(currentDate.getMinutes()).padStart(2, "0");

        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

        // Find all products where the bids array does not exist or is empty,
        // and the endBiddingTime is less than or equal to the current date
        const products = await productCollection
          .find({
            $or: [{ bids: { $exists: false } }, { bids: { $size: 0 } }]
          })
          .toArray();
        const result = products.filter(
          product => product.endBiddingTime < formattedDate
        );

        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    //wekly end  bit
    app.get("/products/bidding-end-week", async (req, res) => {
      try {
        // Retrieve the current date/time
        const products = await productCollection.find({}).toArray();

        const currentDate = new Date();
        const today = currentDate.toISOString().slice(0, 16);
        const futureDate = new Date(
          currentDate.setDate(currentDate.getDate() + 7)
        );
        const formattedDate = futureDate.toISOString().slice(0, 16);

        const filteredProducts = products.filter(
          product =>
            product.endBiddingTime < formattedDate &&
            product.endBiddingTime > today
        );

        res.send(filteredProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });
    //end month
    app.get("/products/bidding-end-month", async (req, res) => {
      try {
        // Retrieve the current date/time
        const products = await productCollection.find({}).toArray();

        const currentDate = new Date();

        const sevenDay = new Date(
          currentDate.setDate(currentDate.getDate() + 7)
        );
        const biggethenSeven = sevenDay.toISOString().slice(0, 16);

        const futureDate = new Date(
          currentDate.setDate(currentDate.getDate() + 30)
        );
        const formattedDate = futureDate.toISOString().slice(0, 16);

        const filteredProducts = products.filter(
          product =>
            product.endBiddingTime < formattedDate &&
            product.endBiddingTime > biggethenSeven
        );

        res.send(filteredProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });
    //upcomming
    app.get("/products/upcoming", async (req, res) => {
      try {
        // Retrieve the current date/time
        const products = await productCollection.find({}).toArray();

        const currentDate = new Date();

        const futureDate = new Date(currentDate.setDate(currentDate.getDate()));
        const formattedDate = futureDate.toISOString().slice(0, 16);

        const filteredProducts = products.filter(
          product => product.startBiddingTime < formattedDate
        );

        res.send(filteredProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
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
          // Bidding has ended, select the winner if not already selected
          if (!product.winner) {
            const winner = highestBid;

            // Set the winner in the product document
            await productCollection.updateOne(
              { _id: new ObjectId(productId) },
              { $set: { winner } }
            );

            // Send email to the winner
            const mailOptions = {
              from: "mdmahmudulla474@gmail.com",
              to: winner.bidderEmail,
              subject: "Congratulations! You won the bid!",
              text: "Dear winner, congratulations on winning the bid. Please proceed with the payment process."
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error("Error sending email:", error);
              } else {
                console.log("Email sent:", info.response);
              }
            });

            return res.status(200).json({
              message: "Bidding has ended. Winner selected and email sent."
            });
          }

          return res
            .status(200)
            .json({ message: "Bidding has ended. Winner already selected." });
        }

        res.status(200).json({ message: "Bidding is still ongoing" });
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

    ///get all winner

    app.get("/bids/winners", async (req, res) => {
      try {
        const products = await productCollection.find({}).toArray();
        const winners = [];

        for (const product of products) {
          if (product.bids.length > 0) {
            const sortedBids = product.bids.sort((a, b) => b.amount - a.amount);
            const highestBid = sortedBids[0];

            winners.push({
              productId: product._id,
              productName: product.name,
              winnerId: highestBid.bidderId,
              winnerName: highestBid.bidderName,
              winningAmount: highestBid.amount
            });
          }
        }

        res.status(200).json({ winners });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winners" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("KB server is going on "));
app.listen(port, () => console.log(`KB  app listening on port ${port}!`));
