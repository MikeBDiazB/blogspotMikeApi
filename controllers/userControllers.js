const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")
const fs = require('fs')
const path = require('path')
const {v4:uuid} = require('uuid')
const User = require("../models/userModel");
const HttpError = require("../models/errorModel");

//====== REGISTER A NEW USER
// POST : api/users/register
// UNPROTECTED
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;

    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    const newEmail = email.toLowerCase();
    const emailExists = await User.findOne({ email: newEmail });

    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    if (!password2 || password2.trim().length < 6) {
      return next(new HttpError("Password should be at least 6 characters.", 422));
    }

    if (password !== password2) {
      return next(new HttpError("Passwords do not match.", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);
    const newUser = await User.create({ name, email: newEmail, password: hashedPass });

    res.status(201).json(`New user ${newUser.email} registered`);
  } catch (error) {
    return next(new HttpError("User registration failed.", 500));
  }
};

//====== LOGIN A REGISTERED USER
// POST : api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new HttpError("Fill in all fields.", 422))
        }
        const newEmail = email.toLowerCase();

        const user = await User.findOne({ email: newEmail })
        if (!user) {
            return next(new HttpError("Invalid credentials.", 422))
        }
        const comparePas = await bcrypt.compare(password, user.password)
        if (!comparePas) {
            return next(new HttpError("Invalid credentials.", 422))
        }
        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" })
        res.status(200).json({ token, id, name })
    } catch (error) {
        return next(new HttpError("Login failed. Please check your credentials.", 422))
    }
};

//====== USER PROFILE
// POST : api/users/:id
// PROTECTED
const getUser = async (req, res, next) => {
   try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password');
        if(!user){
            return next(new HttpError ("User not found.", 404))
        }
        res.status(200).json(user);
   } catch (error){
    return next (new HttpError (error))
   }
};

//====== CHANGE USER AVATAR (profile picture)
// POST : api/users/change-avatar
// PROTECTED
const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image.", 422));
    }

    // Find user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    // Delete old avatar if it exists
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err && err.code !== "ENOENT") {
          return next(new HttpError("Failed to delete old avatar.", 500));
        }
      });
    }

    const { avatar } = req.files;

    // Check file size (limit: 500KB)
    if (avatar.size > 500000) {
      return next(new HttpError("Profile picture too big. Should be less than 500KB.", 422));
    }

    // Generate new unique filename
    let fileName = avatar.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

    // Move file to the uploads directory
    avatar.mv(path.join(__dirname, "..", "uploads", newFilename), async (err) => {
      if (err) {
        return next(new HttpError("Failed to upload image.", 500));
      }

      // Update user avatar in the database
      const updatedAvatar = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: newFilename },
        { new: true }
      );

      if (!updatedAvatar) {
        return next(new HttpError("Avatar couldn’t be changed.", 422));
      }

      res.status(200).json(updatedAvatar);
    });
  } catch (error) {
    return next(new HttpError("Something went wrong.", 500));
  }
};

module.exports = changeAvatar;

//====== EDIT USER DETAILS (from profile)
// POST : api/users/edit-user
// PROTECTED
const editUser = async (req, res, next) => {
  res.json("Edit user details");
};

//====== GET AUTHORS
// POST : api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select('-password');
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error))
  }
};

module.exports = { registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors };
