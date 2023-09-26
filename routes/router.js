const router = require("express").Router();
require("dotenv").config();
// const database = include('DBConnectionMongoDB');
const MongoStore = require("connect-mongo");
//const mongoSanitize = require('express-mongo-sanitize');
const session = require("express-session");
const expireTime = 24 * 60 * 60 * 1000; // session expire time, persist for 1 hour.

const bcrypt = require("bcrypt");
const saltRounds = 12;

// mySQL
const db_users = include('database/users');


//Cloudinary
const database = include("databaseConnectionMongoDB");
var ObjectId = require("mongodb").ObjectId;
const { v4: uuid } = require("uuid");
const passwordPepper = "SeCretPeppa4MySal+";
const crypto = require('crypto');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const mongodb_database = process.env.REMOTE_MONGODB_DATABASE;
const userCollection = database.db(mongodb_database).collection("users");
const petCollection = database.db(mongodb_database).collection("pets");
const userPicCollection = database
  .db(mongodb_database)
  .collection("userPicture");

const Joi = require("joi");
const mongoSanitize = require("express-mongo-sanitize");

router.use(mongoSanitize({ replaceWith: "%" }));

//router.use(mongoSanitize(
//    {replaceWith: '%'}
//));


// ****** MongoDB sessions *****//
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster1.5f9ckjd.mongodb.net/COMP4921_Project1_DB?retryWrites=true&w=majority`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

router.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  })
);
//testing

router.get("/pic", async (req, res) => {
  res.send(
    '<form action="picUpload" method="post" enctype="multipart/form-data">' +
      '<p>Public ID: <input type="text" name="title"/></p>' +
      '<p>Image: <input type="file" name="image"/></p>' +
      '<p><input type="submit" value="Upload"/></p>' +
      "</form>"
  );
});

router.post("/picUpload", upload.single("image"), function (req, res, next) {
  let buf64 = req.file.buffer.toString("base64");
  stream = cloudinary.uploader.upload(
    "data:image/png;base64," + buf64,
    function (result) {
      //_stream
      console.log(result);
      res.send(
        'Done:<br/> <img src="' +
          result.url +
          '"/><br/>' +
          cloudinary.image(result.public_id, {
            format: "png",
            width: 100,
            height: 130,
            crop: "fit",
          })
      );
    },
    { public_id: req.body.title }
  );
  console.log(req.body);
  console.log(req.file);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
//ttesting

function isValidSession(req, res, next) {
  if (req.session.authenticated) {
      next();
  } else {
      res.render("error", {message: "Not Authenticated"});
  }
}

//* User is brought to index page to login or sign up */
router.get("/", async (req, res) => {
  console.log("index page hit");
  try {
    const users = await userCollection
      .find()
      .project({ first_name: 1, last_name: 1, email: 1, _id: 1 })
      .toArray();

    if (users === null) {
      res.render("error", { message: "Error connecting to MongoDB" });
      console.log("Error connecting to user collection");
    } else {
      users.map((item) => {
        item.user_id = item._id;
        return item;
      });
      console.log(users);

      res.render("index", { allUsers: users });
    }
  } catch (ex) {
    res.render("error", { message: "Error connecting to MySQL" });
    console.log("Error connecting to MySQL");
    console.log("this is where we need to check")
    console.log(ex);
  }
});

router.get("/login", async (req, res) => {
	console.log("index page hit");

		res.render("login");

  });
router.get("/signup", async (req, res) => {
	console.log("index page hit");
	res.render("signup");

  });

router.get("/link", isValidSession, async (req, res) => {
  console.log("index page hit");
  try {
    const users = await userCollection
      .find()
      .project({ first_name: 1, last_name: 1, email: 1, _id: 1 })
      .toArray();

    if (users === null) {
      res.render("error", { message: "Error connecting to MongoDB" });
      console.log("Error connecting to user collection");
    } else {
      users.map((item) => {
        item.user_id = item._id;
        return item;
      });
      console.log(users);

      res.render("links", { allUsers: users });
    }
  } catch (ex) {
    res.render("error", { message: "Error connecting to MySQL" });
    console.log("Error connecting to MySQL");
    console.log(ex);
  }
});

//* Login check */
router.post("/loggingin", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var users = await db_users.getUsers();
  var user;
  for (i = 0; i < users.length; i++) {
    console.info(users[i].email);
    if (users[i].email == email) {
        user = users[i];
    }
  }
  for (i = 0; i < users.length; i++) {
      const isValidPassword = bcrypt.compareSync(password, user.hashed_password)
      if (user.email == email) {
          if (isValidPassword){
              req.session.userID = user.user_id
              req.session.authenticated = true;
              req.session.email = email;
              req.session.cookie.maxAge = expireTime;
              res.redirect('/link');
              return
          }
          else if (!isValidPassword){
              req.session.authenticated = false;
              res.redirect('/login');
              return;
          }
      }
  }
  //User & PW combo not found.
  res.render("login");
});
//** CREATING THE USER SECTION */
//** Render tempUserSignup which is /createUser originally, renamed for temp use. */
router.get("/createUser", (req, res) => {
  //TODO render awesome custom & stylized Sign Up page by Changwhi
  res.render("tempUserSignup", { title: "Sign up Page" });
});

//* Middleware for hashing password and pushing into mySQL DB*/
router.post("/submitUser", async (req, res) => {
  var email = req.body.email;
  var password = req.body.password;
  var name = req.body.name;
  var hashedPassword = bcrypt.hashSync(password, saltRounds);
  var success = await db_users.createUser({email: email, hashedPassword: hashedPassword, name: name});
  if (success) {
    res.redirect('/login')
  } else if (!success) {
    res.render('error', {message: `Failed to create the user ${email}, ${name}`, title: "User creation failed"})
  }
});


router.get("/tempLoggedin", (req, res) => {
  var html = `
    You are logged in!
    `;
  res.send(html);
});

router.get("/showPics", async (req, res) => {
  console.log("picture page");
  try {
    let user_id = "65024305f583fccec9aa2b99";
    //req.query.id;
    console.log("userId: " + user_id);

    // Joi validate
    const schema = Joi.object({
      user_id: Joi.string().alphanum().min(24).max(24).required(),
    });

    const validationResult = schema.validate({ user_id });
    if (validationResult.error != null) {
      console.log(validationResult.error);

      res.render("error", { message: "Invalid user_id" });
      return;
    }
    const pics = await userPicCollection
      .find({ user_id: new ObjectId(user_id) })
      .toArray();

    if (pics === null) {
      res.render("error", { message: "Error connecting to MongoDB" });
      console.log("Error connecting to userModel");
    } else {
      pics.map((item) => {
        item.pic_id = item._id;
        return item;
      });
      console.log(pics);
      res.render("images", {allPics: pics, user_id: user_id});
    }
  } catch (ex) {
    res.render("error", { message: "Error connecting to MongoDB" });
    console.log("Error connecting to MongoDB");
    console.log(ex);
  }
});

router.post("/addpic", async (req, res) => {
  try {
    console.log("form submit");

    let user_id = req.body.user_id;

    const schema = Joi.object({
      user_id: Joi.string().alphanum().min(24).max(24).required(),
      name: Joi.string().alphanum().min(2).max(50).required(),
      comment: Joi.string().alphanum().min(2).max(150).required(),
    });

    const validationResult = schema.validate({
      user_id,
      name: req.body.pic_name,
      comment: req.body.comment,
    });

    if (validationResult.error != null) {
      console.log(validationResult.error);

      res.render("error", { message: "Invalid first_name, last_name, email" });
      return;
    }

    await userPicCollection.insertOne({
      name: req.body.pic_name,
      user_id: new ObjectId(user_id),
      comment: req.body.comment,
    });

	res.redirect(`/showPics?id=${user_id}`);
} catch (ex) {
    res.render("error", { message: "Error connecting to MySQL" });
    console.log("Error connecting to MySQL");
    console.log(ex);
  }
});

router.post("/setUserPic", upload.single("image"), function (req, res, next) {
  let image_uuid = uuid();
  let pic_id = req.body.pic_id;
  let user_id = req.body.user_id;
  let buf64 = req.file.buffer.toString("base64");
  stream = cloudinary.uploader.upload(
    "data:image/octet-stream;base64," + buf64,
    async function (result) {
      try {
        console.log(result);

        console.log("userId: " + user_id);

        // Joi validate
        const schema = Joi.object({
          pic_id: Joi.string().alphanum().min(24).max(24).required(),
          user_id: Joi.string().alphanum().min(24).max(24).required(),
        });

        const validationResult = schema.validate({ pic_id, user_id });
        if (validationResult.error != null) {
          console.log(validationResult.error);

          res.render("error", { message: "Invalid pet_id or user_id" });
          return;
        }
        const success = await userPicCollection.updateOne(
          { _id: new ObjectId(pic_id) },
          { $set: { image_id: image_uuid } },
          {}
        );

        if (!success) {
          res.render("error", {
            message: "Error uploading pet image to MongoDB",
          });
          console.log("Error uploading pet image");
        } else {
          res.redirect(`/showPics?id=${user_id}`);
        }
      } catch (ex) {
        res.render("error", { message: "Error connecting to MongoDB" });
        console.log("Error connecting to MongoDB");
        console.log(ex);
      }
    },
    { public_id: image_uuid }
  );
  console.log(req.body);
  console.log(req.file);
});

router.get('/deletePics', async (req, res) => {
	try {
		console.log("delete pet image");

		let pet_id = req.query.id;
		let user_id = req.query.user;
		let is_user_pic = req.query.pic;
		let pic_id = req.query.id;

		const schema = Joi.object(
			{
				user_id: Joi.string().alphanum().min(24).max(24).required(),
				pet_id: Joi.string().alphanum().min(24).max(24).required(),
			});

		const validationResult = schema.validate({user_id, pet_id});

		if (validationResult.error != null) {
			console.log(validationResult.error);

			res.render('error', {message: 'Invalid user_id or pet_id'});
			return;
		}

		if (is_user_pic == 'true') {
			console.log("pic_id: "+pet_id);
			const success = await userPicCollection.updateOne({"_id": new ObjectId(pic_id)},
				{$set: {image_id: undefined}},
				{}
			);

			console.log("delete User Image: ");
			console.log(success);
			if (!success) {
				res.render('error', {message: 'Error connecting to MySQL'});
				return;
			}
		res.redirect(`/showPics`);

		}
	}
	catch(ex) {
		res.render('error', {message: 'Error connecting to MySQL'});
		console.log("Error connecting to MySQL");
		console.log(ex);
	}
});


router.get("/login", (req, res) => {
  res.render("login", { title: "Login Page" });
});

router.get('*', (req, res) => {
	res.status(404).render('error', {message: "404 No such page found."})
})

module.exports = router;
