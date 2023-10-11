const express = require("express");
const { DateTime } = require("luxon");
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
    pass: "pfnnszixydqzfkhz"
  }
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
    deprecationErrors: true
  }
});

async function run() {
  try {
    const userCollection = client.db("KB").collection("users");
    const koyelCollection = client.db("KB").collection("koyel");
    const sellerkoyelCollection = client
      .db("KB")
      .collection("koyel-item-seller");
    const hostRequestsCollection = client.db("KB").collection("hostRequests");
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
        res.status(500).json({ message: "Login failed" });
      }
    });

    ///upd  user profile

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;

      const info = req.body;

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
      const {
        phoneNumber,
        businessName,
        businessAddress,
        tinNum,
        tradeLN,
        tradeLNImg,
        ircnumber,
        ircimg,
        nidImageUrl
      } = req.body;

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
          tradeLNImg,
          ircnumber,
          ircimg,
          nidImageUrl
        }
      };

      const result = await userCollection.updateOne(filter, uptadeDoc, options);
      console.log(result);
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

      userCollection.updateOne(
        { email: email },
        { $set: { role: "" } },
        err => {
          if (err) {
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
    //perticuller  user  seller
    app.get("/user/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    ///get  singel user
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    /// koyel   product start here

    ///upload   product koyel
    app.post("/products/items/v1", async (req, res) => {
      try {
        const product = req.body;
        await koyelCollection.insertOne(product);
        res.status(200).json({ message: "Product  upload  successfully" });
      } catch (error) {
        res.status(500).json({ message: "  product not  upload " });
      }
    });

    //seller product   get seller upload product
    app.get("/products/items/v1/:id", async (req, res) => {
      const userid = req.params.id;
      const products = await koyelCollection
        .find({ authorId: userid })
        .toArray();
      res.send(products);
    });

    app.get("/seller/products/items/v1", async (req, res) => {
      const products = await koyelCollection
        .find({ status: "pending" })
        .toArray();
      res.send(products);
    });

    //get all  koyel product
    app.get("/products/items/v1", async (req, res) => {
      const products = await koyelCollection
        .find({ status: "approve" })
        .toArray();
      res.send(products);
    });

    ///dlete product   koyel item
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      try {
        // Find and delete the associated payment
        const paymentoptions = {
          productId: id
        };
        const payment = await koyelitempaymentColletion.deleteMany(
          paymentoptions
        );

        // Delete the product
        const result = await koyelCollection.deleteOne(query);
        console.log(result, payment);
        res.json({
          result,
          payment,
          message: "Deleted product and payment successfully"
        });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "An error occurred while deleting" });
      }
    });

    //get all  koyel product by category name

    ///get cr
    app.get("/products/category/cr", async (req, res) => {
      const result = await koyelCollection
        .find({ category: "CR", status: "approve" })
        .toArray();
      res.send(result);
    });

    app.get("/products/category/ga", async (req, res) => {
      const result = await koyelCollection
        .find({ category: "GI/GA", status: "approve" })
        .toArray();
      res.send(result);
    });

    app.get("/products/category/po", async (req, res) => {
      const result = await koyelCollection
        .find({ category: "PO/HR", status: "approve" })
        .toArray();
      res.send(result);
    });

    ///get singel koyel item
    app.get("/products/koyel/:id", async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) };
      const result = await koyelCollection.findOne(query);
      res.send(result);
    });

    /////test api pass here

    ///koyel  bid place
    app.post("/product/:productId/bid/v1", async (req, res) => {
      const { productId } = req.params;
      const { koyelBids, createBids } = req.body;

      try {
        // Find the product by ID
        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Check if bidding is still open
        const bdTime = DateTime.now().setZone("Asia/Dhaka");
        const formattedDate = bdTime.toFormat("yyyy-MM-dd'T'HH:mm");
        if (formattedDate > product.endBiddingTime) {
          return res.status(400).json({ error: "Bidding has ended" });
        }

        // Iterate through each koyel bid data
        koyelBids.forEach(async koyelBid => {
          const {
            koyelId,
            bidAmount,
            bidderName,
            bidderEmail,
            bidderId,
            koyel,
            shipping,
            bidderPhoto,
            bidderNumber,
            businessName,
            businessAddress,
            productName,
            productID,
            productPhoto,
            shippingInfo
          } = koyelBid;
          // Find the koyel object by ID
          const koyelitem = product.koyel.find(koyel => koyel._id === koyelId);
          if (!koyelitem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }
          // Create a new bid object
          const newBid = {
            bidAmount,
            shipping,
            bidderName,
            bidderEmail,
            bidderId,
            bidderPhoto,
            bidderNumber,
            businessName,
            businessAddress,
            productName,
            productID,
            productPhoto,
            koyelId,
            shippingInfo,
            currentBid: bidAmount,
            item: koyel?.item,
            spec: koyel?.spec,
            Thickness: koyel?.Thickness,
            Width: koyel?.Width,
            weight: koyel?.weight,
            TS: koyel?.TS,
            YP: koyel?.YP,
            EL: koyel?.EL
          };
          console.log(newBid?.currentBid);

          // Add the new bid to the koyel object's bids array
          koyelitem.bids.push(newBid);
        });

        product.bids.push(createBids);

        // Update the product in the database
        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: product }
        );

        return res.json({
          message: "Bids placed successfully"
        });
      } catch (error) {
        console.error("Error placing bids:", error);
        return res.status(500).json({ error, error: "Internal Server Error" });
      }
    });

    //my bids
    app.get("/user/bids/:bidderId", async (req, res) => {
      try {
        const { bidderId } = req.params;
        // Find all products that have bids from the bidder
        const products = await koyelCollection.find({}).toArray();

        const bids = products.flatMap(product =>
          product?.bids?.filter(bid => bid.bidderId === bidderId)
        ); // Flatten the array

        res.json({ bids: bids });
      } catch (error) {
        res.status(500).json({ error: "Bids not Found " });
      }
    });

    //get  winner
    app.get("/products/:productId/koyel/winner", async (req, res) => {
      try {
        const { productId } = req.params;
        // Find the product by its ID in the database
        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
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
        const initialWinner = [];

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
          const bdTime = DateTime.now().setZone("Asia/Dhaka");
          const formattedDate = bdTime.toFormat("yyyy-MM-dd'T'HH:mm");

          if (formattedDate >= koyel.endBiddingTime) {
            // Bidding has ended, select the winner if not already selected
            if (!koyel.winner) {
              koyel.winner = highestBid;
              // Save the updated koyel object in the product document
              await koyelCollection.updateOne(
                { _id: new ObjectId(productId) },
                { $set: { "koyel.$[koyel].winner": koyel.winner } },
                { arrayFilters: [{ "koyel._id": koyel._id }] }
              );

              initialWinner.push(highestBid); // Add the winner to the winners array
            } else {
              initialWinner.push(koyel.winner); // Winner already selected for this koyel object
            }
          }
        }

        const filteredData = {};

        // Restructure the data
        initialWinner.forEach(item => {
          const {
            bidderId,
            bidderEmail,
            bidderName,
            bidderPhoto,
            bidderNumber,
            businessName,
            businessAddress,
            productName,
            productID,
            shipping,
            productPhoto
          } = item;

          if (!filteredData[bidderEmail]) {
            filteredData[bidderEmail] = {
              bidderId,
              bidderEmail,
              bidderName,
              bidderPhoto,
              bidderNumber,
              businessName,
              businessAddress,
              businessName,
              businessAddress,
              productName,
              productID,
              productPhoto,
              shipping,
              winproduct: [],
              total: 0,
              totalWeight: 0,
              averagePerKgPrice: 0
            };
          }

          filteredData[bidderEmail].winproduct.push({
            bidderNumber: item.bidderNumber,
            koyelId: item.koyelId,
            minimumBid: item.minimumBid,
            currentBid: item.currentBid,
            item: item.item,
            spec: item.spec,
            Thickness: item.Thickness,
            Width: item.Width,
            weight: item.weight,
            TS: item.TS,
            YP: item.YP,
            EL: item.EL
          });
          // Calculate the total for the bidder by accumulating the product of currentBid and weight
          filteredData[bidderEmail].total += item.currentBid * item.weight;
          filteredData[bidderEmail].totalWeight += item.weight;
          filteredData[bidderEmail].averagePerKgPrice =
            filteredData[bidderEmail].total /
            filteredData[bidderEmail].totalWeight;
        });

        // Convert the filtered data object into an array
        let emailsSent = true;
        const winners = Object.values(filteredData);

        // Send emails to winners

        winners.forEach(async winner => {
          const mailOptions = {
            from: "auctionKB@gmail.com",
            to: winner.bidderEmail,
            subject: "Congratulations! You have won the auction",
            html: `
        <ul>
     <p>Here are your winning products</p>
          ${winner.winproduct
            .map(
              product => `
            <li>
              Item: ${product.item}, 
              Spec: ${product.spec}, 
              Thickness: ${product.Thickness}, 
              Width: ${product.Width}, 
              Weight: ${product.weight}, 
              TS: ${product.TS}, 
              YP: ${product.YP}, 
              EL: ${product.EL}
            </li>`
            )
            .join("")}
        </ul>
        





  <h1> Total : ${winner?.total + "$"} </h1>
    <h1> Total Weight : ${winner?.totalWeight + "KG"} </h1>
        <div>
   <div 
        <div ><h1> DH S&T</h1></div>
  
   <div style="  display: flex;
        flex-direction: column;
        line-height: 1px;">
    <h2>DONG HAENG STEEL & TRADING CO., LTD
</h2>
<p>405 , 110-7 , OKGIL-RO, BUCHEON, GYEONGGI-DO, KOREA
</p>
<p>TEL : +82-2-6231-1219 </p>
<p>FAX : +82 -2-6231 -1218

   </div>
  
   </div><hr />

 <div >
<p>CONTRACT NO : DH-230918 </p>
<p>DATE:
</p>
<p>BUYER :${winner?.businessName},
            ${winner?.businessAddress}
 </p>
 </div>
 <p>We are glad to inform this to you
</p>
  


<p>** Q'TY and PRICE, TOTAL AMOUNT : +/- 10%,</p>
<p>Conditions The remaining amount of payment should be paid by TT as soon as sign the agreement. and; then LC should be
    open within a week.</p>
<p>a. Shipment : Approximately 2 weeks after receiving of LC</p>
<p>b. Paymenet : Irrevocable LC at sight to Seller's bank, within 2 weeks after signing date/</p>
<p>c. Price term : CFR ICD KAMALAPUR PORT</p>
<p>d. effective : After signature</p>
<p>e. Packing : Export standard packing</p>
<p>f. Required documents : BL, INV, PL, CO</p>
<p>g. Remark : Secondary Quality, as per packing list and photos. No Claim, No MTC THEORITICAL WEIGHT NOT ACCEPTABLE.
    ORIGINAL NET WEIGHT</p>

<p style="margin-top: 20px; font-weight: bold ; font-size:36px;" >h. Seller's Bank Detail</p>
<p style="font-size:16px; ">Name : INDUSTRIAL BANK OF KOREA , SIHWA KONGDAN</p>
<p style="font-size:16px; "> Address : 50, ULCHIRO 2-GA, CHUNG-GU , SEOUL, SOUTH KOREA</p>
<p style="font-size:16px; ">Account No. 378-148066-56-00014 (SWIFT CORD : IBKOKRSE)</p>
<p style="font-size:16px; ">Account Holder : DONG HAENG STEEL & TRADING CO., LTD</p>
<p style="font-size:16px; ">Signed by SELLER signed by BUYER</p>
<p style="font-size:16px; ">DH S&T</p>
<p style="font-size:16px; ">As fer packing list CFR ICD</p>
 <div style="display: flex; margin-top: 60px; justify-content: space-between; justify-items: center;">
    <div> <img src="https://i.ibb.co/2jbvWwM/Screenshot-16.png"/></div>
    <div>
        <h3>signed by BUYER</h3>
        <hr/>
    </div>
 </div>
</div>
        `
          };

          try {
            await transporter.sendMail(mailOptions);

            console.log(`Email sent to ${winner.bidderEmail}`);
          } catch (error) {
            console.error(
              `Error sending email to ${winner.bidderEmail}:`,
              error
            );
          }
        });

        //upd product
        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { winners: winners } }
        );

        res.status(200).json({ winners: winners });
      } catch (error) {
        res.status(500).json({ error: "Error retrieving winners" });
      }
    });

    //user bid win
    app.get("/user/wins/:bidderId", async (req, res) => {
      try {
        const { bidderId } = req.params;
        // Find all products that have bids from the bidder
        const products = await koyelCollection.find({}).toArray();

        const wins = products.flatMap(product =>
          product?.winners?.filter(winner => winner.bidderId === bidderId)
        );

        res.json({ wins: wins });
      } catch (error) {
        res.status(500).json({ error: "Bids not Found " });
      }
    });

    ///bid close  with  bid

    app.get("/products/koyel-item/closed-bids/with-bids", async (req, res) => {
      try {
        const bdTime = DateTime.now().setZone("Asia/Dhaka");
        const formattedDate = bdTime.toFormat("yyyy-MM-dd'T'HH:mm");
        const products = await koyelCollection
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

    ////bid close with no bid
    app.get("/products/koyel-item/closed-bids/no-bids", async (req, res) => {
      try {
        const bdTime = DateTime.now().setZone("Asia/Dhaka");
        const formattedDate = bdTime.toFormat("yyyy-MM-dd'T'HH:mm");
        const products = await koyelCollection
          .find({
            endBiddingTime: { $lt: formattedDate }
          })
          .toArray();

        const result = products.filter(
          product => product.bids.length === 0 || product.bids.length === 0
        );
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Error retrieving products" });
      }
    });

    //// koyel  item payment
    ///post koyel item   payment

    app.post("/koyel-item/payment/:id", async (req, res) => {
      const productID = req.params.id;
      const paymentinfo = req.body;
      const product = await koyelCollection.findOne({
        _id: new ObjectId(productID)
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const payment = await koyelitempaymentColletion.insertOne({
        productId: productID,
        productPhoto: paymentinfo.products?.productPhoto,
        productName: paymentinfo.products?.productName,
        totalWeight: paymentinfo.products?.totalWeight,
        total: paymentinfo.products?.total,
        averagePerKgPrice: paymentinfo.products?.averagePerKgPrice,
        bidderId: paymentinfo.products?.bidderId,
        bidderNumber: paymentinfo.products?.bidderNumber,
        bidderEmail: paymentinfo.products?.bidderEmail,
        bidderName: paymentinfo.products?.bidderName,
        bidderPhoto: paymentinfo.products?.bidderPhoto,
        paymentDetails: paymentinfo.payment,
        winproduct: paymentinfo?.products?.winproduct,
        shippingInfo: paymentinfo?.shippingInfo,
        shippingPriceset: paymentinfo.products.shipping,
        bill: paymentinfo?.bill,
        status: "pending"
      });

      for (const item of paymentinfo?.products?.winproduct) {
        const { koyelId } = item;

        const koyelItem = product.koyel.find(item => item._id === koyelId);

        if (!koyelItem) {
          return res
            .status(404)
            .json({ error: `Koyel object with ID ${koyelId} not found` });
        }

        // Update koyelItem.payment and koyelItem.status
        koyelItem.payment = "pending";
        koyelItem.status = "pending";
      }

      const updatedWinnersArray = product.winners.map(item => {
        if (
          item.bidderEmail === paymentinfo?.products?.bidderEmail &&
          item.bidderId === paymentinfo?.products?.bidderId
        ) {
          return { ...item, status: "pending" };
        }
        return item;
      });

      // Update the product document in MongoDB
      await koyelCollection.updateOne(
        { _id: new ObjectId(productID) },
        { $set: { koyel: product.koyel, winners: updatedWinnersArray } }
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
            bidderId: bidderId
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
      const query = { productId: id };
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
            productId: productId,
            bidderId: bidderId
          },
          { sort: { _id: -1 } }
        );

        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "approve" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find(item => item._id === koyelId);

          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          koyelItem.payment = "approve";
          koyelItem.status = "sold-out";
        }

        const updatedWinnersArray = product.winners.map(item => {
          if (item.bidderId === bidderId) {
            return { ...item, status: "approve" }; // This should set status to "approve"
          }
          return item;
        });

        try {
          // Update the product document in MongoDB
          await koyelCollection.updateOne(
            { _id: new ObjectId(productId) },
            { $set: { koyel: product.koyel, winners: updatedWinnersArray } }
          );
        } catch (error) {
          console.error("Error updating product:", error);
        }

        res.send({ message: "Product updated successfully" });
      }
    );

    //payment fiald
    app.put(
      "/product/:productId/koyel-item/payment/Failed/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;

        const { itemId } = req.body;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productId: productId,
            bidderId: bidderId
          },
          { sort: { _id: -1 } }
        );

        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find(item => item._id === koyelId);

          if (!koyelItem) {
            return res
              .status(404)
              .json({ error: `Koyel object with ID ${koyelId} not found` });
          }

          koyelItem.payment = "";
          koyelItem.status = "";
        }

        const updatedWinnersArray = product.winners.map(item => {
          if (item.bidderId === bidderId) {
            return { ...item, status: "" };
          }
          return item;
        });

        // Update the product document in MongoDB
        await koyelCollection.updateOne(
          { _id: new ObjectId(productId) },
          { $set: { koyel: product.koyel, winners: updatedWinnersArray } }
        );
        res.send({ message: "product  updated successfully" });
      }
    );

    /// get my koyel item  payment order api
    app.get("/product/koyel-item/:bidderId/order", async (req, res) => {
      const productId = req.params.productId;
      const bidderId = req.params.bidderId;
      const orders = await koyelitempaymentColletion
        .find({
          bidderId: bidderId,
          order: "order"
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
            bidderId: bidderId
          },
          { sort: { _id: -1 } }
        );

        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "approve" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
        });

        ///uptadekoyelItem
        for (const items of itemId) {
          const { koyelId, item } = items;

          const koyelItem = product.koyel.find(item => item._id === koyelId);

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
            EL: item?.koyel.EL
          };

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

    ////koyuel item pament faild  succe
    app.put(
      "/product/:productId/koyel-item/payment/approve/:bidderId",
      async (req, res) => {
        const productId = req.params.productId;
        const bidderId = req.params.bidderId;
        const { itemId } = req.body;
        const payment = await koyelitempaymentColletion.findOne(
          {
            productID: productId,
            bidderId: bidderId
          },
          { sort: { _id: -1 } }
        );
        await koyelitempaymentColletion.updateOne(
          { _id: payment?._id },
          { $set: { status: "" } }
        );

        const product = await koyelCollection.findOne({
          _id: new ObjectId(productId)
        });

        ///uptadekoyelItem
        for (const item of itemId) {
          const { koyelId } = item;

          const koyelItem = product.koyel.find(item => item._id === koyelId);

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
    app.get("/products/payment/approved", async (req, res) => {
      try {
        const approvedProducts = await koyelitempaymentColletion
          .find({ status: "approve" })
          .toArray();

        res.json(approvedProducts);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
          error: "An error occurred while fetching approved products"
        });
      }
    });

    ///this koyel item post    order

    app.post("/product/koyel-item/order/:id", async (req, res) => {
      const productId = req.params.id;
      const paymentinfo = req.body.paymentDetails;
      const { products, shippingInfo, payment, items, bill } = paymentinfo;
      //   // // Find the product by ID
      const product = await koyelCollection.findOne({
        _id: new ObjectId(productId)
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const bdTime = DateTime.now().setZone("Asia/Dhaka");
      const formattedDate = bdTime.toFormat("yyyy-MM-dd'T'HH:mm");

      // ///post  order
      const paymentDetails = {
        productId: productId,
        productPhoto: products?.productPhoto,
        productName: products?.productName,
        totalWeight: bill?.totalWeight,
        total: bill?.SubTotal,
        averagePerKgPrice: bill?.perkg,
        bidderId: paymentinfo?.bidderId,
        bidderNumber: paymentinfo?.bidderNumber,
        bidderEmail: paymentinfo?.bidderEmail,
        bidderName: paymentinfo?.bidderName,
        bidderPhoto: paymentinfo?.bidderPhoto,
        paymentDetails: payment,
        winproduct: items,
        shippingInfo: shippingInfo,
        shippingPriceset: products?.ShippingCost,
        bill: bill,
        status: "pending",
        order: "order"
      };
      await koyelitempaymentColletion.insertOne(paymentDetails);

      try {
        return res.json({
          message: "Order Place succefull successfully"
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
      console.log("api is hitter ", bidderId);
      const history = await koyelitempaymentColletion
        .find({ bidderId: bidderId })
        .toArray();
      res.send(history);
    });
    ///get inteck product payment history
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("KB server is going on "));
app.listen(port, () => console.log(`KB  app listening on port ${port}!`));
