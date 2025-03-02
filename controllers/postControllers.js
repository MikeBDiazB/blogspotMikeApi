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
   try {
    const posts = await Post.find().sort({updatedAT: -1})
    res.status(200).json(posts)

   } catch (error) {
    return next (new HttpError(error))
   }

  }
  
  //=================================== GET SINGLE POST
  // GET: api/posts/:id
  // UNPROTECTED
  const getPost = async (req, res, next) => {
    try {
         const postId = req.params.id;
         const post = await Post.findById(postId)
         if(!post) {
            return next(new HttpError("Post not found.", 404))
         }
         res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error))
    }
  };
  
  //=================================== GET POSTS BY CATEGORY
  // GET: api/posts/categories/:category
  // PROTECTED
  const getCatPosts = async (req, res, next) => {
    try {
        const {category} = req.params;
        const catPosts = await Post.find({category}).sort({createdAt: -1})
        res.status(200).json(catPosts)
    } catch(error) {
         return next (new HttpError(error))
    }
  };

  //=================================== GET POSTS BY AUTHOR/USER
  // GET: api/posts/users/:id
  // UNPROTECTED
  const getUserPosts = async (req, res, next) => {
    try {
     const {id} = req.params;
     const posts = await Post.find({creator: id}).sort({createdAt: -1})
     res.status(200).json(posts)
    } catch (error) {
        return next (new HttpError(error))
    }
  };
  
//=================================== EDIT POST
// PATCH: api/posts/:id
// PROTECTED
const editPost = async (req, res, next) => {
  try {
      let fileName;
      let newFilename;
      let updatedPost;
      const postID = req.params.id;
      let { title, category, description } = req.body;

      if (!title || !category || description.length < 12) {
          return next(new HttpError("Fill in all fields.", 422));
      }

      // Get old post from database
      const oldPost = await Post.findById(postID);
      if (!oldPost) {
          return next(new HttpError("Post not found.", 404));
      }

      // Ensure the current user is the post creator
      if (req.user.id !== oldPost.creator.toString()) {
          return next(new HttpError("Unauthorized to edit this post.", 403));
      }

      if (!req.files) {
          updatedPost = await Post.findByIdAndUpdate(postID, { title, category, description }, { new: true });
      } else {
          // Delete old thumbnail from uploads
          fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), (err) => {
              if (err) {
                  console.error("Error deleting old thumbnail:", err);
              }
          });

          // Upload new thumbnail
          const { thumbnail } = req.files;

          // Check file size
          if (thumbnail.size > 2000000) {
              return next(new HttpError("Thumbnail too big. Should be less than 2MB", 422));
          }

          fileName = thumbnail.name;
          let splittedFilename = fileName.split('.');
          newFilename = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

          // Move file
          await new Promise((resolve, reject) => {
              thumbnail.mv(path.join(__dirname, '..', 'uploads', newFilename), (err) => {
                  if (err) reject(new HttpError(err));
                  else resolve();
              });
          });

          updatedPost = await Post.findByIdAndUpdate(postID, { title, category, description, thumbnail: newFilename }, { new: true });
      }

      if (!updatedPost) {
          return next(new HttpError("Post could not be updated.", 422));
      }
      res.status(200).json(updatedPost);
  } catch (error) {
      return next(new HttpError(error.message));
  }
};


//=================================== DELETE POST
// DELETE: api/posts/:id
// PROTECTED 
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id.trim(); // Trim to prevent invalid ObjectId errors

    if (!postId) {
      return next(new HttpError("Post unavailable.", 400));
    }

    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }

    // Ensure the current user is the post creator
    if (req.user.id !== post.creator.toString()) {
      return next(new HttpError("Unauthorized to delete this post.", 403));
    }

    // Delete thumbnail if it exists
    if (post.thumbnail) {
      try {
        await fs.promises.unlink(path.join(__dirname, '..', 'uploads', post.thumbnail));
      } catch (err) {
        console.error("Error deleting file:", err);
        // If file deletion fails, still proceed with post deletion
      }
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Reduce user's post count
    const currentUser = await User.findById(req.user.id);
    if (currentUser) {
      const newPostCount = Math.max(0, (currentUser.posts || 1) - 1);
      await User.findByIdAndUpdate(req.user.id, { posts: newPostCount });
    }

    res.json({ message: `Post ${postId} deleted successfully.` });

  } catch (error) {
    return next(new HttpError(error.message || "Post could not be deleted.", 500));
  }
};
  
  module.exports = { createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost, deletePost };
  