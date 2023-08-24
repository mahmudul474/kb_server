const express = require("express");
const app = express();
var cors = require("cors");
const port = process.env.PORT || 5000;
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const path = require("path");
const bodyParser = require("body-parser");

//email send
// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mdmahmudulla474@gmail.com",
    pass: "pfnnszixydqzfkhz",
  },
});

///midleWere
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
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
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("KB").collection("users");
    const productCollection = client.db("KB").collection("products");
    const koyelCollection = client.db("KB").collection("koyel");
    const hostRequestsCollection = client.db("KB").collection("hostRequests");
    const paymentColletion = client.db("KB").collection("payments");
    const koyelitempaymentColletion = client
      .db("KB")
      .collection("koyelitempayment");

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
            email: user.email,
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
          userPhoto: info?.userPhoto,
        },
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
          expiresIn: "1d",
        });

        return res.send({ accessToken: token });
      }

      res.status(403).send({ accessToken: "" });
    });

    ///get  all  users

    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const users = await userCollection.find({}).toArray();
      const result = users.filter((user) => user.email !== email);
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
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    //make   bidder

    app.put("/user/bidder/:id", async (req, res) => {
      const id = req.params.id;
      const { phoneNumber, businessName, businessAddress, tinNum, tradeLN } =
        req.body;
      console.log(req.body);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const uptadeDoc = {
        $set: {
          role: "bidder",
          phoneNumber,
          businessName,
          businessAddress,
          tinNum,
          tradeLN,
        },
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
          role: "disabled",
        },
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
          message,
        },
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
        email: email,
      });
      if (alreadeseller) {
        return res.status(403).send({ message: "already send request" });
      }

      console.log(alreadeseller);

      const result = await hostRequestsCollection.insertOne({
        info,
        email,
        status: "pending",
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
          status: "approved",
        },
      };

      userCollection.updateOne(
        { email: email },
        { $set: { role: "seller" } },
        (err) => {
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
        (err) => {
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
        endBiddingTime,
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
          endBiddingTime,
        },
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
            endBiddingTime: { $lt: formattedDate },
          })
          .toArray();

        const result = products.filter(
          (product) => product.bids.length !== 0 || product.bids.length > 0
        );
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    //end bidding with out bid
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
            $or: [{ bids: { $exists: false } }, { bids: { $size: 0 } }],
          })
          .toArray();
        const result = products.filter(
          (product) => product.endBiddingTime < formattedDate
        );

        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    ////today  end bidding
    app.get("/products/bidding-end-today", async (req, res) => {
      try {
        // Retrieve the current date/time
        const currentDate = new Date();
        const today = currentDate.toISOString().slice(0, 16);

        // Calculate the end date/time for 24 hours from now
        const futureDate = new Date(
          currentDate.getTime() + 24 * 60 * 60 * 1000
        );
        const formattedDate = futureDate.toISOString().slice(0, 16);

        console.log(formattedDate);

        // Find products with bidding ending within the next 24 hours
        const filteredProducts = await productCollection
          .find({
            endBiddingTime: { $gt: today, $lt: formattedDate },
          })
          .toArray();

        res.send(filteredProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    app.get("/products/bidding-end-less-than-24-hours", async (req, res) => {
      try {
        // Retrieve the current date/time
        const currentDate = new Date();

        // Calculate the end date/time for 24 hours from now
        const futureDate = new Date(
          currentDate.getTime() + 24 * 60 * 60 * 1000
        );
        console.log(futureDate);

        // Find products with endBiddingTime less than 24 hours from now
        const filteredProducts = await productCollection
          .find({
            endBiddingTime: { $lt: futureDate },
          })
          .toArray();

        res.send(filteredProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
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
          productPhoto,
        } = req.body;

        // Find the product by its ID in the database
        const product = await productCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if bidding is still open
        const currentTime = new Date().getTime();
        const biddingEndTime = new Date(product.endBiddingTime).getTime();
        if (currentTime > biddingEndTime) {
          return res.status(400).json({ error: "Bidding has ended" });
        } else if (product.status === "sold-out") {
          return res.status(400).json({ error: "product sold-out " });
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
              "New price cannot be lower than the current bid price plus the minimum bid amount.",
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
          timestamp: new Date().toISOString(),
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
          _id: new ObjectId(productId),
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
              { $set: { winner, status: "pending" } }
            );

            // Send email to the winner
            const mailOptions = {
              from: "mdmahmudulla474@gmail.com",
              to: winner.bidderEmail,
              subject: "Congratulations! You won the bid!",
              text: "Dear winner, congratulations on winning the bid. Please proceed with the payment process.",
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error("Error sending email:", error);
              } else {
                console.log("Email sent:", info.response);
              }
            });

            return res.status(200).json({
              message: "Bidding has ended. Winner selected and email sent.",
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

    ///get my bidd
    app.get("/bids/bidder/:bidderId/products", async (req, res) => {
      try {
        const { bidderId } = req.params;

        // Find all products that have bids from the bidder
        const products = await productCollection
          .find({
            "bids.bidderId": bidderId,
          })
          .toArray();

        res.status(200).json({ products });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving bidder's products" });
      }
    });

    ///get my  win bids
    app.get("/my-wins", async (req, res) => {
      try {
        const userEmail = req.query.email; // Get the user's email from the query parameter

        // Find all products where the user is the winner
        const winningProducts = await productCollection
          .find({
            "winner.bidderEmail": userEmail,
          })
          .toArray();

        res.send(winningProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winning products" });
      }
    });
    ///get all winner
    app.get("/products/winners", async (req, res) => {
      const winners = await productCollection
        .find({ winner: { $exists: true } })
        .project({ _id: 0, winner: 1 })
        .toArray();
      res.json(winners.map(({ winner }) => winner));
    });
    /// admin order  order
    app.get("/orders", async (req, res) => {
      const query = { order: "order" };
      const result = await paymentColletion.find(query).toArray();
      res.send(result);
    });
    //approve order
    app.put("/payment/admin/order/approve/:id", async (req, res) => {
      const id = req.params.id;
      const winner = req.body;

      console.log(id, "this is id from me an my site ");
      console.log(winner);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };

      const result = await paymentColletion.updateOne(filter, updateDoc);

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const hours = String(currentDate.getHours()).padStart(2, "0");
      const minutes = String(currentDate.getMinutes()).padStart(2, "0");

      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

      productCollection.updateOne(
        { _id: new ObjectId(winner?.productId) },
        {
          $set: {
            winner,
            endBiddingTime: formattedDate,
            payment: "approved",
            status: "sold-out",
          },
        }
      );
      res.send(result);
    });
    /// payment
    //send payment dettails
    app.post("/payments/details/:id", async (req, res) => {
      const id = req.params.id;
      const details = req.body;
      const result = await paymentColletion.insertOne(details);

      productCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            payment: "pending",
          },
        }
      );

      res.send(result);
    });
    //admin  aprove  payment
    app.put("/payment/admin/approve/:id", async (req, res) => {
      const id = req.params.id;
      const paymentId = req.body;
      const filter = { _id: new ObjectId(paymentId) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };

      const result = await paymentColletion.updateOne(filter, updateDoc);
      productCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            payment: "approved",
            status: "sold out",
          },
        }
      );
      res.send(result);
    });
    ///handle fild   payment
    app.put("/payment/admin/failed/:id", async (req, res) => {
      const id = req.params.id;
      const paymentId = req.body;
      console.log(paymentId);
      const filter = { _id: new ObjectId(paymentId) };
      const updateDoc = {
        $set: {
          status: "failed",
        },
      };

      const result = await paymentColletion.updateOne(filter, updateDoc);
      productCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            payment: "",
          },
        }
      );
      res.send(result);
    });
    //get all   payment
    app.get("/payments", async (req, res) => {
      const result = await paymentColletion.find({}).toArray();
      const payments = result.filter(
        (payment) => payment.status === "approved"
      );
      res.send(payments);
    });
    ///get singel payment
    app.get("/product/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await paymentColletion.findOne(query, {
        sort: { _id: -1 },
      });
      res.send(result);
    });
    ////get my  order
    app.get("/my-orders", async (req, res) => {
      const email = req.query.email;
      const result = await paymentColletion.find({}).toArray();

      const orders = result.filter(
        (order) => order.order === "order" && order?.bidderEmail === email
      );
      res.send(orders);
    });
    /*koyel item start here 



///
/
/
///
/
/
/
/
/
/
/
/
/
*/

    /// koyel   product start here

    ///upload   product koyel
    app.post("/products/upload/koyel", async (req, res) => {
      try {
        const product = req.body;

        // Insert the product into the product collection
        await koyelCollection.insertOne(product);

        // Send success message
        res.status(200).json({ message: "Product  upload  successfully" });
      } catch (error) {
        // Send error message
        res.status(500).json({ message: "  product not  upload " });
      }
    });

    //get all  koyel product
    app.get("/products/koyel", async (req, res) => {
      const result = await koyelCollection.find({}).toArray();
      res.send(result);
    });

    //get all  koyel product by category name

    ///get cr
    app.get("/products/category/cr", async (req, res) => {
      const result = await koyelCollection.find({ category: "CR" }).toArray();
      res.send(result);
    });

    app.get("/products/category/ga", async (req, res) => {
      const result = await koyelCollection.find({ category: "GA" }).toArray();
      res.send(result);
    });

    app.get("/products/category/po", async (req, res) => {
      const result = await koyelCollection.find({ category: "PO" }).toArray();
      res.send(result);
    });

    ///bid close with  bidding
    app.get("/products/koyel-item/closed-bids/with-bids", async (req, res) => {
      try {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const hours = String(currentDate.getHours()).padStart(2, "0");
        const minutes = String(currentDate.getMinutes()).padStart(2, "0");

        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

        const products = await koyelCollection
          .find({
            endBiddingTime: { $lt: formattedDate },
          })
          .toArray();

        const result = products.filter(
          (product) => product.bids.length !== 0 || product.bids.length > 0
        );
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    ///get singel koyel item
    app.get("/products/koyel/:id", async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) };
      const result = await koyelCollection.findOne(query);
      res.send(result);
    });

    ///koyel  bid place
    app.post("/products/:productId/koyel/bids", async (req, res) => {
      const { productId } = req.params;
      const { koyelBids, bidder } = req.body;

      try {
        // Find the product by ID
        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if bidding is still open
        const currentTime = new Date().getTime();
        const biddingEndTime = new Date(product.endBiddingTime).getTime();
        if (currentTime > biddingEndTime) {
          return res.status(400).json({ error: "Bidding has ended" });
        } else if (product.status === "sold-out") {
          return res.status(400).json({ error: "product sold-out " });
        }

        // Iterate through each koyel bid data
        koyelBids.forEach(async (koyelBid) => {
          const {
            koyelId,
            bidAmount,
            bidderName,
            bidderEmail,
            bidderId,
            koyel,
            bidderPhoto,
            bidderNumber,

            expectedDate,
            landing,
            shipmentType,
          } = koyelBid;

          // Find the koyel object by ID
          const koyelitem = product.koyel.find(
            (koyel) => koyel._id === koyelId
          );

          if (!koyelitem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          // Create a new bid object
          const newBid = {
            bidAmount,
            bidderName,
            bidderEmail,
            bidderId,
            bidderPhoto,
            bidderNumber,
            koyelId,
            minimumBid: koyel?.minimumBid,
            currentBid: koyel?.currentBid,
            item: koyel?.item,
            spec: koyel?.spec,
            Thickness: koyel?.Thickness,
            Width: koyel?.Width,
            weight: koyel?.weight,
            TS: koyel?.TS,
            YP: koyel?.YP,
            EL: koyel?.EL,
            expectedDate,
            landing,
            shipmentType,
          };

          // Add the new bid to the koyel object's bids array
          koyelitem.bids.push(newBid);
        });

        const bids = {
          productName: bidder?.productName,
          productID: bidder?.productID,
          productPhoto: bidder?.productPhoto,
          bidderName: bidder?.bidderName,
          bidderEmail: bidder?.bidderEmail,
          bidderId: bidder?.bidderId,
          bidAmount: bidder?.bidAmount,
          bidderPhoto: bidder?.bidderPhoto,
          bidderNumber: bidder?.bidderNumber,
          item: koyelBids,
        };

        product.bids.push(bids);

        // Update the product in the database
        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: product }
        );

        return res.json({
          message: "Bids placed successfully",
        });
      } catch (error) {
        console.error("Error placing bids:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    });
    //my bids
    app.get("/bids/bidder/:bidderId/products/koyel", async (req, res) => {
      try {
        const { bidderId } = req.params;

        // Find all products that have bids from the bidder
        const products = await koyelCollection
          .find({
            "bids.bidderId": bidderId,
          })
          .toArray();

        res.status(200).json({ products });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving bidder's products" });
      }
    });

    //get koyel bids
    // app.get("/products/:productId/koyel/bids", async (req, res) => {
    //   try {
    //     const { productId } = req.params;

    //     // Find the product by its ID in the database
    //     const product = await productCollection.findOne({
    //       _id: new ObjectId(productId)
    //     });

    //     if (!product) {
    //       return res.status(404).json({ error: "Product not found" });
    //     }

    //     // Create an array to store the bids for each koyel object
    //     const bids = [];

    //     // Iterate through each koyel object and retrieve the bids
    //     for (const koyel of product.koyel) {
    //       const koyelBids = koyel.bids;
    //       bids.push(koyelBids);
    //     }

    //     res.status(200).json({ bids });
    //   } catch (error) {
    //     res.status(500).json({ error: "Error retrieving bids" });
    //   }
    // });

    //get koyel item
    app.get("/products/:productId/koyel/winner", async (req, res) => {
      try {
        const { productId } = req.params;

        // Find the product by its ID in the database
        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if any koyel objects exist for the product
        if (product.koyel.length === 0) {
          return res
            .status(400)
            .json({ error: "No koyel objects found for the product" });
        }

        // Iterate through each koyel object and determine the winner
        const winners = [];
        for (const koyel of product.koyel) {
          // Check if any bids exist for the koyel object
          if (koyel.bids.length === 0) {
            continue; // Move on to the next koyel object
          }

          // Find the bid with the highest amount for the koyel object
          const highestBid = koyel.bids.reduce((maxBid, bid) =>
            bid.bidAmount > maxBid.bidAmount ? bid : maxBid
          );

          // Check if the current time is greater than the bidding end time
          const currentTime = new Date().getTime();
          const biddingEndTime = new Date(koyel.endBiddingTime).getTime();

          if (currentTime >= biddingEndTime) {
            // Bidding has ended, select the winner if not already selected
            if (!koyel.winner) {
              koyel.winner = highestBid;

              // Send email to the winner
              const mailOptions = {
                from: "your-email@gmail.com",
                to: highestBid.bidderEmail,
                subject: "Congratulations! You won the bid!",
                text: "Dear winner, congratulations on winning the bid. Please proceed with the payment process.",
              };

              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.error("Error sending email:", error);
                } else {
                  console.log("Email sent:", info.response);
                }
              });

              // Save the updated koyel object in the product document
              await koyelCollection.updateOne(
                { _id: new ObjectId(productId) },
                { $set: { winners, "koyel.$[koyel].winner": koyel.winner } },
                { arrayFilters: [{ "koyel._id": koyel._id }] }
              );

              winners.push(highestBid); // Add the winner to the winners array
            } else {
              winners.push(koyel.winner); // Winner already selected for this koyel object
            }
          }
        }

        res.status(200).json({ winners: winners.filter(Boolean) });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winners" });
      }
    });

    ////winnner

    //get
    // app.get("/products/:productId/koyel/winner", async (req, res) => {
    //   try {
    //     const { productId } = req.params;

    //     // Find the product by its ID in the database
    //     const product = await koyelCollection.findOne({
    //       _id: new ObjectId(productId)
    //     });

    //     if (!product) {
    //       return res.status(404).json({ error: "Product not found" });
    //     }

    //     // Check if any koyel objects exist for the product
    //     if (product.koyel.length === 0) {
    //       return res
    //         .status(400)
    //         .json({ error: "No koyel objects found for the product" });
    //     }

    //     // Iterate through each koyel object and determine the winner
    //     const winners = [];
    //     for (const koyel of product.koyel) {
    //       // Check if any bids exist for the koyel object
    //       if (koyel.bids.length === 0) {
    //         winners.push(null); // No winner found for this koyel object
    //         continue; // Move on to the next koyel object
    //       }

    //       // Find the bid with the highest amount for the koyel object
    //       const highestBid = koyel.bids.reduce((maxBid, bid) =>
    //         bid.bidAmount > maxBid.bidAmount ? bid : maxBid
    //       );

    //       // Check if the current time is greater than the bidding end time
    //       const currentTime = new Date().getTime();
    //       const biddingEndTime = new Date(koyel.endBiddingTime).getTime();

    //       if (currentTime >= biddingEndTime) {
    //         // Bidding has ended, select the winner if not already selected
    //         if (!koyel.winner) {
    //           koyel.winner = highestBid;

    //           // Send email to the winner
    //           const mailOptions = {
    //             from: "your-email@gmail.com",
    //             to: highestBid.bidderEmail,
    //             subject: "Congratulations! You won the bid!",
    //             text: "Dear winner, congratulations on winning the bid. Please proceed with the payment process."
    //           };

    //           transporter.sendMail(mailOptions, (error, info) => {
    //             if (error) {
    //               console.error("Error sending email:", error);
    //             } else {
    //               console.log("Email sent:", info.response);
    //             }
    //           });

    //           // Save the updated koyel object in the product document
    //           await koyelCollection.updateOne(
    //             { _id: new ObjectId(productId) },
    //             { $set: { winners, koyel: product.koyel } }
    //           );

    //           winners.push(highestBid); // Add the winner to the winners array
    //         } else {
    //           winners.push(koyel.winner); // Winner already selected for this koyel object
    //         }
    //       } else {
    //         // winners.push(null); // Bidding is still ongoing for this koyel object
    //       }
    //     }

    //     res.status(200).json({ winners });
    //   } catch (error) {
    //     res.status(500).json({ error: "Error retrieving winners" });
    //   }
    // });

    // app.get("/products/:productId/koyel/winner", async (req, res) => {
    //   try {
    //     const { productId } = req.params;

    //     // Find the product by its ID in the database
    //     const product = await koyelCollection.findOne({
    //       _id: new ObjectId(productId)
    //     });

    //     if (!product) {
    //       return res.status(404).json({ error: "Product not found" });
    //     }

    //     // Check if any koyel objects exist for the product
    //     if (product.koyel.length === 0) {
    //       return res
    //         .status(400)
    //         .json({ error: "No koyel objects found for the product" });
    //     }

    //     // Iterate through each koyel object and determine the winner
    //     const winners = [];
    //     for (const koyel of product.koyel) {
    //       // Check if any bids exist for the koyel object
    //       if (koyel.bids.length === 0) {
    //         winners.push(null); // No winner found for this koyel object
    //         continue; // Move on to the next koyel object
    //       }

    //       // Find the bid with the highest amount for the koyel object
    //       const highestBid = koyel.bids.reduce((maxBid, bid) =>
    //         bid.bidAmount > maxBid.bidAmount ? bid : maxBid
    //       );

    //       // Check if the current time is greater than the bidding end time
    //       const currentTime = new Date().getTime();
    //       const biddingEndTime = new Date(koyel.endBiddingTime).getTime();

    //       if (currentTime >= biddingEndTime) {
    //         // Bidding has ended, select the winner if not already selected
    //         if (!koyel.winner) {
    //           koyel.winner = highestBid;

    //           // Optionally, send email to the winner here

    //           // Save the updated koyel object in the product document
    //           await koyelCollection.updateOne(
    //             { _id: new ObjectId(productId) },
    //             { $set: { koyel: product.koyel } }
    //           );

    //           winners.push(highestBid); // Add the winner to the winners array
    //         } else {
    //           winners.push(koyel.winner); // Winner already selected for this koyel object
    //         }
    //       } else {
    //         winners.push(null); // Bidding is still ongoing for this koyel object
    //       }
    //     }

    //     res.status(200).json({ winners });
    //   } catch (error) {
    //     res.status(500).json({ error: "Error retrieving winners" });
    //   }
    // });

    //get singel product
    app.get("/products/:id", async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    ////get  my win
    app.get("/my-wins/:userId/koyel", async (req, res) => {
      try {
        const userId = req.params.userId; // Get the user ID from the route parameter
        const userEmail = req.query.email; // Get the client email from the query parameter

        // Find the user's winning products based on the provided user ID and email
        const winningProducts = await koyelCollection
          .aggregate([
            {
              $match: {
                "winners.bidderId": userId,
                "winners.bidderEmail": userEmail,
              },
            },
            {
              $project: {
                winners: {
                  $filter: {
                    input: "$winners",
                    as: "winner",
                    cond: {
                      $and: [
                        { $eq: ["$$winner.bidderId", userId] },
                        { $eq: ["$$winner.bidderEmail", userEmail] },
                      ],
                    },
                  },
                },
              },
            },
          ])
          .toArray();

        res.send(winningProducts);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winning products" });
      }
    });
    ///get winner product img and  product name

    app.get("/products/koyel-item/item/:id", async (req, res) => {
      const productId = req.params.id;
      const product = await koyelCollection.findOne({
        _id: new ObjectId(productId),
      });

      if (product) {
        const productName = product.name;
        const productImg = product.mainImage;

        const response = {
          productName: productName,
          productImg: productImg,
        };

        res.json(response);
      } else {
        res.status(404).json({ error: "Product not found" });
      }
    });

    //// koyel  item payment
    ///post koyel item   payment

    app.post("/koyel-item/payment/:id", async (req, res) => {
      const productID = req.params.id;
      const { paymentDetails, items } = req.body;

      const payment = await koyelitempaymentColletion.insertOne({
        paymentDetails,
        productID,
        bidderId: paymentDetails.bidderId,
        koyel: items,
        status: "pending",
      });

      const product = await koyelCollection.findOne({
        _id: new ObjectId(productID),
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      for (const item of items) {
        const { koyelId } = item;

        const koyelItem = product.koyel.find((item) => item._id === koyelId);

        if (!koyelItem) {
          return res
            .status(404)
            .json({ error: `Koyel object with ID ${koyelId} not found` });
        }

        koyelItem.payment = "pending";
        koyelItem.status = "pending";
      }

      await koyelCollection.updateOne(
        { _id: new ObjectId(productID) },
        { $set: { koyel: product.koyel } }
      );

      res.json({ payment, message: "Payment details updated successfully" });
    });

    /// get my koyel item  payment
    app.get(
      "/product/:productId/koyel-item/status/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId,
          },
          { sort: { _id: -1 }, projection: { status: 1 } }
        );
        const status = payment ? payment.status : null;
        res.send({ status });
      }
    );

    ///get  koyel item payment request payment
    app.get("/product/koyel-item/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productID: id };
      const result = await koyelitempaymentColletion.find(query).toArray();
      res.send(result);
    });

    ///appove  payment
    app.put(
      "/product/:productId/koyel-item/payment/approve/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const { itemId } = req.body;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId,
          },
          { sort: { _id: -1 } }
        );
        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "approve" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find((item) => item._id === koyelId);
          console.log(koyelItem);
          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          koyelItem.payment = "approve";
          koyelItem.status = "sold-out";
        }

        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { koyel: product.koyel } }
        );

        res.send({ message: "product  updated successfully" });
      }
    );

    ///fiald payment koyel ite,
    app.put(
      "/product/:productId/koyel-item/payment/Failed/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const { itemId } = req.body;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId,
          },
          { sort: { _id: -1 } }
        );
        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find((item) => item._id === koyelId);
          console.log(koyelItem);
          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          koyelItem.payment = "";
          koyelItem.status = "s";
        }

        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { koyel: product.koyel } }
        );

        res.send({ message: "product  updated successfully" });
      }
    );

    /// get my    koyel  item buy product
    /// get my koyel item  payment
    app.get("/product/koyel-item/:bidderId/order", async (req, res) => {
      const productId = req.params.productId;
      const bidderId = req.params.bidderId;
      const orders = await koyelitempaymentColletion
        .find({
          bidderId: bidderId,
          order: "order",
        })
        .toArray();

      res.send(orders);
    });

    ///apovro buy now payment
    app.put(
      "/product/:productId/koyel-item/payment/approve/winner/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const { itemId, paymentDetails } = req.body;

        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId,
          },
          { sort: { _id: -1 } }
        );

        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "approve" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        ///uptadekoyelItem
        for (const items of itemId) {
          const { koyelId, item } = items;

          const koyelItem = product.koyel.find((item) => item._id === koyelId);

          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          const winner = {
            bidAmount: paymentDetails?.amount / itemId?.length,

            bidderName: paymentDetails?.bidderName,

            bidderEmail: paymentDetails?.bidderEmail,

            bidderId: paymentDetails?.bidderId,

            bidderPhoto: paymentDetails?.bidderPhoto,
            bidderNumber: paymentDetails?.bidderNumber,
            koyelId,
            item: item?.koyel.item,
            spec: item?.koyel.spec,
            Thickness: item?.koyel.Thickness,
            Width: item?.koyel.Width,
            weight: item?.koyel.weight,
            TS: item?.koyel.TS,
            YP: item?.koyel.YP,
            EL: item?.koyel.EL,
          };

          console.log(paymentDetails);

          koyelItem.payment = "approve";
          koyelItem.status = "sold-out";
          koyelItem.winner = winner;
        }

        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { koyel: product.koyel } }
        );

        res.send({ message: "product  updated successfully" });
      }
    );

    ////koyuel item pament faild
    app.put(
      "/product/:productId/koyel-item/payment/approve/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const { itemId } = req.body;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId,
          },
          { sort: { _id: -1 } }
        );
        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "approve" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find((item) => item._id === koyelId);
          console.log(koyelItem);
          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          koyelItem.payment = "";
          koyelItem.status = "";
        }

        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { koyel: product.koyel } }
        );

        res.send({ message: "product  updated successfully" });
      }
    );

    ///get all approver payment in a single  product
    app.get("/products/approved/:productId", async (req, res) => {
      const productId = req.params.productId;
      const approvedProducts = await koyelitempaymentColletion
        .find({ productID: productId, status: "approve" })
        .toArray();
      console.log(approvedProducts);
      res.json(approvedProducts);
    });

    /////post  koyel item  a order

    app.post("/product/koyel-item/order/:id", async (req, res) => {
      const productId = req.params.id;
      const { paymentDetails, items } = req.body;

      const {
        transaction,
        bankSleep,
        amount,
        branch,
        bank,
        bidderName,
        bidderId,
        bidderEmail,
        bidderNumber,
        bidderPhoto,
      } = paymentDetails;

      ///post  order
      const payment = {
        paymentDetails,
        productID: productId,
        bidderId: paymentDetails?.bidderId,
        koyel: items,
        status: "pending",
        order: "order",
      };
      await koyelitempaymentColletion.insertOne(payment);

      try {
        //   // // Find the product by ID
        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        // Iterate through each koyel bid data
        items.forEach(async (koyelBid) => {
          const { koyelId, koyel } = koyelBid;
          // Find the koyel object by ID
          const koyelitem = product.koyel.find(
            (koyel) => koyel._id === koyelId
          );
          if (!koyelitem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          // Create a new bid object
          const newBid = {
            bidAmount: items.length / amount,
            bidderName,
            bidderEmail,
            bidderId,
            bidderPhoto,
            bidderNumber,
            koyelId,
            minimumBid: koyel?.minimumBid,
            currentBid: koyel?.currentBid,
            item: koyel?.item,
            spec: koyel?.spec,
            Thickness: koyel?.Thickness,
            Width: koyel?.Width,
            weight: koyel?.weight,
            TS: koyel?.TS,
            YP: koyel?.YP,
            EL: koyel?.EL,
          };
          // //Add the new bid to the koyel object's bids array
          koyelitem.bids.push(newBid);
        });
        // Update the product in the database
        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: product }
        );
        return res.json({
          message: "Bids placed successfully",
        });
      } catch (error) {
        console.error("Error placing bids:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    });

    ///get all koil item order

    app.get("/product/koyel-item/order", async (req, res) => {
      const query = { order: "order" };
      const orders = await koyelitempaymentColletion.find(query).toArray();
      res.send(orders);
    });

    /////get my payment history
    app.get("/my-payment-history/koyelitempayment/:id", async (req, res) => {
      const bidderId = req.params.id;
      const history = await koyelitempaymentColletion
        .find({ bidderId: bidderId })
        .toArray();
      res.send(history);
    });
    ///get inteck product payment history
    app.get("/my-payment-history/product/:id", async (req, res) => {
      const bidderId = req.params.id;
      const history = await paymentColletion
        .find({ bidderId: bidderId })
        .toArray();
      res.send(history);
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("KB server is going on "));
app.listen(port, () => console.log(`KB  app listening on port ${port}!`));
