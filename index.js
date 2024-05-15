const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.port || 5000;

// middlewares
const corsOptions = {
  origin: ["http://localhost:5173",
   "http://localhost:5174",
   "https://unityplate-3fee4.web.app",
  "https://unityplate-3fee4.firebaseapp.com"
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// MARK:jwt verify  middleWare
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized access" });
      }
      // console.log(decoded);

      req.user = decoded;
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iu3pv7s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const foodCollection = client.db("unityPlates").collection("foods");
    const requestedCollection = client
      .db("unityPlates")
      .collection("requstedFoods");

    // MARK: jwt generate
    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "7d",
        });
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ succes: true });
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      }
    });

    // Clear token on logout
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    // create and add a new food to the collection
    app.post("/postedfoods", async (req, res) => {
      const newFood = req.body;
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });

    // // POST endpoint to add data to the requestedfoods collection
    app.post("/requestedfoods", async (req, res) => {
      const requestedFood = req.body;
      const result = await requestedCollection.insertOne(requestedFood);
      res.send(result);
      // console.log(result)
    });

    // MARK:REQUESTEDfoods get the requested food
    app.get("/getMyFoods/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { requestorEmail: email };
      const result = await requestedCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });

    //  get the data from db to show on the website (6 cards)
    app.get("/foods", async (req, res) => {
      const result = await foodCollection
        .find({})
        .sort({ foodQuantity: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get all the staus='availabefoods' foods with sort by expireDate
    app.get("/availabefoods", async (req, res) => {
      const result = await foodCollection
        .find({ status: "available" })
        .sort({ expiredDate: 1 })
        .toArray();
      res.send(result);
      // console.log(result);
    });

    // get foods by sorted order
    app.get("/availabefoodsorted", async (req, res) => {
      const result = await foodCollection
        .find({ status: "available" })
        .sort({ expiredDate: -1 })
        .toArray();
      res.send(result);
    });

    // get the all foods by email address
    app.get("/manageAllFoods/:email", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email || tokenEmail == null) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await foodCollection
        .find({ "userDetails.email": email })
        .toArray();
      res.send(result);
    });

    // get foods by search || from Available foods page
    app.get("/searchfoods/:search", async (req, res) => {
      const search = req.params.search;
      const result = await foodCollection
        .find({ foodName: { $regex: new RegExp(search, "i") } })
        .toArray();
      res.send(result);
    });

    // get single foods details with id
    app.get("/fooddetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // update a specific foods data by it's id
    app.put("/updatesFoodData/:id", verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (!tokenEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const updatedFood = req.body;
      const result = await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedFood }
      );
      res.send(result);
    });

    // delete the food from the database
    app.delete("/deletefood/:id", async (req, res) => {
      const id = req.params.id;
      const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("UNITY PLATES SERVER IS OK");
});
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
