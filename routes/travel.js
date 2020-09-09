//requiring the modules
const router = require("express").Router();
const User = require("../models/User");
const fs = require("fs");
const passport = require("passport");
let date = new Date();

//for reading json files
let content = fs.readFileSync(
  "/home/bharath/Videos/Athreva/routes/cabs.json",
  "utf-8"
);
//convering string into object
let parsedContent = JSON.parse(content);
//converting objct into array
let entries = Object.entries(parsedContent);

//test route

router.get("/index", (req, res) => {
  res.send("working");
});

//ROUTES
//route for getting details about one particular user

router.post("/userDetails", async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json("User Not Found");
    } else {
      res.status(200).json({ user });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json("Internal Server Error");
  }
});

//Route for getting details of travel history of the user

router.post(
  "/user/history",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      let userHistory = await User.findOne({ email: req.body.email });
      if (userHistory.trip.length > 0) {
        res.status(200).json(userHistory.trip);
      } else {
        res.status(404).json("No History Found");
      }
    } catch (e) {
      res.status(500).json("Internal server error");
    }
  }
);

//Route for getting the nearest and best driver based on the pickup points

router.put(
  "/travel/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let time = `${date.getDate()}/${date.getMonth() +
      1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    try {
      const pickup = req.body.pickup.toLowerCase();
      const { destination } = req.body;
      //matching the nearest users
      let filteredArray = entries.filter(i => i[1].area === pickup);
      //getting the id of user
      const id = req.params.id;
      //fetching user's doucument
      let data = await User.findById(id);
      //if no user found
      if (!data) {
        res.status(404).json("there is no user registered with this email");
        //if user found and the user did not call the cab more than 5 times
      } else if (data.count <= 4) {
        if (filteredArray.length === 0) {
          filteredArray = "Sorry All The Drivers Are Busy At The Moment";
          return res.status(400).send("We Do not Operate In that area");
        } else {
          const details = {
            pickup,
            destination,
            availablecabs: filteredArray,
            time: time,
            cabs: entries.length
          };
          data.trip.push(details);
          data.count += 1;
          const updateData = await User.findByIdAndUpdate(req.params.id, data);
          if (updateData) {
            return res.status(200).json({ bestDriver: details });
          } else {
            return res.status(404).json("no user found with the provided id");
          }
        }
      }
      //if user called cab more than 5 times
      else {
        res
          .status(403)
          .json(
            "you should not travel more during these times. Stay Home Stay Safe"
          );
      }
    } catch (e) {
      console.log(e);
      res.status(500).json("Internal error");
    }
  }
);

module.exports = router;
