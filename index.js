const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.port || 5000;

// middlewares
const corsOptions = {
  origin: ["*", "http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
//   app.use(cookieParser())

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
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const foodCollection = client.db("unityPlates").collection("foods");
    const requstedCollection = client.db("unityPlates").collection("requstedFoods");

    // create and add a new food to the collection
    app.post("/postedfoods", async (req, res) => {
      const newFood = req.body;
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });
    

    // // POST endpoint to add data to the requestedfoods collection
    app.post("/requestedfoods", async (req, res) => {
      const requestedFood = req.body;
      const result = await requstedCollection.insertOne(requestedFood);
      res.send(result);
      // console.log(result)
    });


    // get the requested food from the database || requsted foods
    app.get("/getMyFoods/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      const result = await requstedCollection
      .find({ email })
      .toArray();
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
      })
      
      
      // get foods by sorted order
      app.get("/availabefoodsorted", async (req, res) => {
        const result = await foodCollection
        .find({ status: "available" })
        .sort({ expiredDate: -1 })
        .toArray();
        res.send(result);
        // console.log(result);
      });
      

      // get the all foods by email address
      app.get('/manageAllFoods/:email', async (req, res) => {
        const email = req.params.email;
        const result = await foodCollection.find({ "userDetails.email" : email }).toArray()
        res.send(result);
      })




      // get foods by search || from Available foods page
      app.get("/searchfoods/:search", async (req, res) => {
        const search = req.params.search;
        const result = await foodCollection
        .find({ foodName: { $regex: new RegExp(search, "i") } })
        .toArray();
        res.send(result);
      });
      
      // get foods details with id
      app.get("/fooddetails/:id", async (req, res) => {
        const id = req.params.id;
        console.log(id)
        const result = await foodCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
        console.log(result)
      });

      // update a specific foods data by it's id
      app.put("/updatesFoodData/:id", async (req, res) => {
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
  res.send("UNITY PLATE CRUD IS RUNNING");
});
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
