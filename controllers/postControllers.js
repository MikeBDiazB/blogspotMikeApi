const Post = require('../models/postModel')
const User = require('../models/userModel')
const path = require ('path')
const fs = require( 'fs')
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel')




//=================================== CREATE A POST
// POST: api/posts
// PROTECTED
const createPost = async (req, res, next) => {
    try {
      let { title, category, description } = req.body;  // Fixed typo: 'descrition' to 'description'
      if (!title || !category || !description || !req.files) {  // Fixed typo: 'descrition' to 'description'
        return next(new HttpError("Fill in all the fields and choose thumbnail.", 422));
      }
  
      const { thumbnail } = req.files;
  
      // Check the file size
      if (thumbnail.size > 2000000) {
        return next(new HttpError("Thumbnail too big. File should be less than 2MB.", 422));
      }
  
      let filename = thumbnail.name;
      let splittedFilename = filename.split('.');
      let newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1]; // Fixed typo: 'lenght' to 'length'
  
      thumbnail.mv(path.join(__dirname, '..', '/uploads', newFilename), async (err) => {  // Fixed missing closing parenthesis
        if (err) {
          return next(new HttpError(err));
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFilename,  // Fixed casing issue: 'newfilename' to 'newFilename'
            creator: req.user.id
          });
  
          if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
          }
  
          // Find user and increase post count by 1
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
  
          res.status(201).json(newPost);
        }
      });
    } catch (error) {
      return next(new HttpError(error));
    }
  };
  
  //=================================== GET ALL POSTS
  // GET: api/posts
  // UNPROTECTED
  const getPosts = async (req, res, next) => {
    res.json("Get all Posts");
  };
  
  //=================================== GET SINGLE POST
  // GET: api/posts/:id
  // UNPROTECTED
  const getPost = async (req, res, next) => {
    res.json("Get single Post");
  };
  
  //=================================== GET POSTS BY CATEGORY
  // GET: api/posts/categories/:category
  // PROTECTED
  const getCatPosts = async (req, res, next) => {
    res.json("Get Posts by category.");
  };
  
  //=================================== GET POSTS BY AUTHOR/USER
  // GET: api/posts/users/:id
  // UNPROTECTED
  const getUserPosts = async (req, res, next) => {
    res.json("Get user posts.");
  };
  
  //=================================== EDIT POST
  // PATCH: api/posts/:id
  // PROTECTED
  const editPost = async (req, res, next) => {
    res.json("Edit Post");
  };
  
  //=================================== DELETE POST
  // DELETE: api/posts/:id
  // PROTECTED
  const deletePost = async (req, res, next) => {
    res.json("Delete Post");
  };
  
  // Corrected export
  module.exports = { createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost, deletePost };
  