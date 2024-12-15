const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema");
const mongoose = require('mongoose');
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = require("../routes/user");
const category = require("../model/categorySchema");
const cart=require("../model/cartSchema");
const addressSchema=require("../model/addressSchema");
const orderSchema=require("../model/orderSchema");
const saltrounds=10;
require('dotenv').config();
let otpStore = {};  // To temporarily store OTPs 


module.exports={
    //register user
    registerUser:async (req,res)=>{
        try {
           const{name,email,password}=req.body
           console.log(`Name: ${name} , Email: ${email} , Password: ${password}`)

           // Check if user exists
           const existingUser = await userSchema.findOne({ email: email });
           if (existingUser) {
               return res.status(400).json({status:false,message:"User already exists"})
           }

           // Generate OTP and store it temporarily
           const otp = crypto.randomInt(1000, 10000); // 4-digit OTP
           otpStore[email] = { otp: otp, time: Date.now(), name, email, password };

           // Send OTP via email
           sendOtpEmail(email, otp);

           // Render OTP verification page
           return res.status(200).json({status:true,message:"OTP sent successfully",email:email})
           
       } catch (error) {
           console.error("Error during registration:", error);
           res.status(500).json({status:false ,message:"An error occurred during registration"});
       }
   },
    //load signup
    loadSignup:(req,res)=>{
        try {
          res.render("user/signup")  
        } catch (error) {
            res.status(500).send("page not found")
        }
    },
    //load login
    loadLogin:(req,res)=>{
        try {
            res.render("user/login")
        } catch (error) {
            res.status(500).send("error occured")
        }
    },
    // login user
    loginUser:async (req,res)=>{
        try {
            const { email, password } = req.body
            console.log(`Email: ${email}, Password: ${password}`);

            const user= await userSchema.findOne({email:email})
            
            if(!user){
                return res.status(400).json({status:false,message:"User doesn't exist"})
            }
            const match= await bcrypt.compare(password,user.password)
            if(!match){
                return res.status(400).json({status:false,message:"Password doesn't match"})
            }
            if(user.isBlock){
                return res.status(400).json({status:false,isBlock:true,messsage:"User is Blocked by admin"})
            }
            req.session.user=user;
            return res.status(200).json({status:true, isBlock:false,message:"Login Successfully"})
            
        } catch (error) {
             res.status(500).json({status:false,message:"Error Occured"})
        }
    }, 
    
    //loadotp page
    loadOtp:(req,res)=>{
        try {
            const {email} = req.query; 
            res.render('user/verifyOtp',{email}) //load otp page
            
        } catch (error) {
            console.log("otp page not found")
            res.status(500).json({status: false,message: "Error loading OTP verification page"});
            
        }
    },

    // Verify OTP
    verifyOtp: async (req, res) => {
      try{  
        const { email, otp } = req.body;

        console.log("verify otp :" +otp)
        if (!otpStore[email]) {
            return res.status(400).json({ status: false, message: "No OTP request found for this email" });
        }


        if (otpStore[email] && otpStore[email].otp == otp) {
            const timeElapsed = Date.now() - otpStore[email].time;
            if (timeElapsed < 1 * 60 * 1000) { // otp valid for 1 minutes
                //create user in database
                const { name, password } = otpStore[email];
                const hashedPassword = await bcrypt.hash(password, saltrounds);
                const newUser = new userSchema({ name, email, password: hashedPassword, status: true });
                await newUser.save();

                // clear otp store
                delete otpStore[email];
                // redirect to home
                return res.status(200).json({ status: true, message: "OTP verified successfully, user created!" });
            } else {
                return res.status(400).json({ status: false, message: "OTP expired. Please request a new one." });
            }
        } else {
            res.status(400).json({ status: false, message: "Invalid OTP" });
        }
     } catch(error){
            console.error("Error during OTP verification:", error);
            res.status(500).json({status:false,message: "An error occurred during OTP verification"});
     }
    },

    // Resend OTP
    resendOtp: (req, res) => {
      try{  
        const { email } = req.body;
        const currentTime = Date.now();
        const resendCooldown = 60 * 1000;  

        if (otpStore[email]) {
            const timeElapsed = currentTime - otpStore[email].time;
            if (timeElapsed < resendCooldown) {
                const remainingTime = Math.ceil((resendCooldown - timeElapsed) / 1000);
                res.status(400).json({ status: false, message: `Please wait ${remainingTime} seconds before resending OTP.` });  
            }
        }

        
        const otp = crypto.randomInt(1000, 10000);
        otpStore[email] = { ...otpStore[email],otp: otp, time: currentTime };
        
        sendOtpEmail(email, otp);

        res.status(200).json({ status: true, message: "OTP resent successfully." });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({
            status: false,
            message: "Error resending OTP"
        });
     }
   },

    loadHome:async (req,res)=>{
        try {
            const products= await productSchema.find({isDeleted:false}).populate({path:'category',match: {isBlock:false}}).exec();

            const filterProduct= products.filter(product=> product.category !==null)
            const user=req.session.user

            const Obj=filterProduct.map((data)=>{
                return{
                    _id:data._id,
                    name:data.name,
                    description:data.description,
                    category:data.category,
                    brand:data.brand,
                    price:data.price,
                    images:data.images
                }
            })
            res.render("user/home",{data:Obj,user})
        } catch (error) {
            console.log(error)
            res.status(500).send("Error Occured")
        }
    },
    loadproductView:async(req,res)=>{
        try {
            const findProduct=await productSchema.findById(req.params.productId)
            const userId=req.session.user;
            const user=await userSchema.findById(userId)

            const products=await productSchema.find({isDeleted:false}).populate({path:"category",match:{isBlock:false}}).exec()
            const filterProduct=products.filter(product=> product.category!==null)

            const Obj=filterProduct.map((find)=>{
                return{
                    _id:find._id,
                    name:find.name,
                    description:find.description,
                    category:find.category,
                    brand:find.brand,
                    price:find.price,
                    images:find.images
                }
            })
            
           res.render("user/productView",{data:findProduct,find:Obj,user}) 
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    //loadShopPage
    
     loadCart: async (req, res) => {
        try {
            const userId = req.session.user;
            const user=await userSchema.findById(userId)
            if (!userId) {
                return res.redirect('/user/login'); 
            }

            
            const cartItems = await cart.find({ userId }).populate("productId").exec();
            
            // Calculate total for the cart
            const cartDetails = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                subtotal: item.productId.price * item.quantity // Calculate subtotal for each item
            }));

            const total = cartDetails.reduce((acc, item) => acc + item.subtotal, 0);

            res.render("user/cart", { cartItems: cartDetails, total ,user});
        } catch (error) {
            console.error("Error fetching cart:", error);
            res.status(500).send("Error loading cart");
        }
    },
    addToCart: async (req, res) => {
        try {
            const { productId, quantity } = req.body;
            const userId = req.session.user; 
    
            
            const requestedQuantity = parseInt(quantity);
            if (requestedQuantity <= 0) {
                return res.status(400).json({ status: false, message: "Invalid quantity" });
            }
    
            
            const product = await productSchema.findById(productId);
    
            if (!product) {
                return res.status(404).json({ status: false, message: "Product not found" });
            }
    
            
            if (product.stock === 0) {
                return res.status(400).json({ status: false, message: "Product is out of stock" });
            }
    
            
            const existingCartItem = await cart.findOne({ userId, productId });
    
            if (existingCartItem) {
                const totalQuantity = existingCartItem.quantity + requestedQuantity;
    
                
                if (totalQuantity > 4) {
                    return res.status(400).json({
                        status: false,
                        message: "You cannot add more than 4 units Limit Exceeded",
                    });
                }
    
                
                if (totalQuantity > product.stock) {
                    return res.status(400).json({
                        status: false,
                        message: `Insufficient stock, Only ${product.stock} left`,
                    });
                }
    
                
                existingCartItem.quantity = totalQuantity;
                await existingCartItem.save();
                return res.status(200).json({ status: true, message: "Product quantity updated in cart" });
            } else {
                
                if (requestedQuantity > 4) {
                    return res.status(400).json({
                        status: false,
                        message: "You cannot add more than 4 units Limit Exceeded",
                    });
                }
    
                
                if (requestedQuantity > product.stock) {
                    return res.status(400).json({
                        status: false,
                        message: `Insufficient stock, Only ${product.stock} left`,
                    });
                }
    
                
                const newCartItem = new cart({
                    userId,
                    productId,
                    quantity: requestedQuantity,
                });
                await newCartItem.save();
                return res.status(200).json({ status: true, message: "Product added to cart successfully!" });
            }
        } catch (error) {
            console.error("Error adding product to cart:", error);
            res.status(500).json({ status: false, message: "Error adding to cart" });
        }
    },
    
    
    updateCartQuantity: async (req, res) => {
        const { productId, quantity } = req.body;
        console.log('Received data:', { productId, quantity }); 
      
        try {
          const userId = req.session.user; 
      
          
          console.log('User ID:', userId);
      
          
          const result = await cart.updateOne(
            { userId, 'items.productId': productId },
            { $set: { 'items.$.quantity': quantity } }
          );
      
          
          console.log('Update result:', result);
      
          res.status(200).json({ message: 'Quantity updated successfully' });
        } catch (error) {
          console.error('Error updating cart quantity:', error);
          res.status(500).json({ message: 'Failed to update quantity' });
        }
      },
      
   
    removeFromCart: async (req, res) => {
        try {
            const { productId } = req.body;
            const userId = req.session.user;

            
            await cart.deleteOne({ userId, productId });

            res.redirect('/user/cart');
        } catch (error) {
            console.error("Error removing product from cart:", error);
            res.status(500).json({ status: false, message: "Error removing product from cart" });
        }
    },

    loadProfile:async(req,res)=>{
        try {
            const userId=req.session.user;
            const user=await userSchema.findById(userId)
            if(!user){
                return res.status(404).send("User not found")
            }
            res.render('user/profile',{user });
        } catch (error) {
            console.log(error);
            res.status(500).send("Error occured")
        }
    },
    updateProfile: async(req,res)=>{
        try {
            const userId = req.session.user;
            const { name, gender } = req.body;
    
            
            let profileImage = null;
            if (req.file) {
                profileImage = req.file.path; 
            }
    
            // Find and update the user's profile
             await userSchema.findByIdAndUpdate(userId, {
                name:name.trim(),
                gender:gender.trim(),
                profileImage: profileImage || undefined, 
            }, { new: true });
    
            res.redirect('/user/profile'); 
        } catch (error) {
            console.error("Error updating profile:", error);
            res.status(500).json({ status: false, message: "Error updating profile" });
        }
    },
    loadAddress:async(req,res)=>{
        try {
            const userId=req.session.user;
            const user=await userSchema.findById(userId)
            const addresses=await addressSchema.find({userId}).sort({createdAt:-1})
            res.render("user/address",{addresses,user});
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: 'Failed to retrieve addresses', error: error.message });

        }
    },
    loadCheckout:async(req,res)=>{
        try {
            const userId=req.session.user;
            if (!userId) {
                return res.redirect('/user/login'); 
            }
            const user=  await userSchema.findById(userId);
            const address= await addressSchema.find({userId})

            const cartItems = await cart.find({ userId }).populate("productId").exec();

            const cartDetails = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                subtotal: item.productId.price * item.quantity
            }));

            const total = cartDetails.reduce((acc, item) => acc + item.subtotal, 0);

            res.render("user/checkout",{user,address,cartItems:cartDetails,total})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured");
        }
    },
    placeOrder: async (req, res) => {
        try {
          const userId = req.session.user;
          if (!userId) {
            return res.redirect('/user/login');
          }
      
          const { addressId, paymentMethod } = req.body;
      
          
          const cartItems = await cart.find({ userId }).populate("productId").exec();
      
          if (!cartItems.length) {
            return res.status(400).json({ message: "Your cart is empty. Add products before placing an order." });
          }
      
         
          const address = await addressSchema.findById(addressId);
          if (!address) {
            return res.status(400).json({ message: "Invalid address selected." });
          }
      
          // Prepare order data
          const orderItems = cartItems.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            subtotal: item.productId.price * item.quantity,
          }));
      
          const total = orderItems.reduce((acc, item) => acc + item.subtotal, 0);
          
           // Reduce stock for each product
        for (const item of cartItems) {
            const product = await productSchema.findById(item.productId._id);

            if (product) {
                if (product.stock < item.quantity) {
                    return res.status(400).json({ 
                        message: `Not enough stock .Only ${product.stock} left.` 
                    });
                }

                product.stock -= item.quantity; 
                await product.save(); 
            }
        }
          
          const newOrder = new orderSchema({
            userId,
            address,
            items: orderItems,
            total,
            paymentMethod,
            status: "Pending",
            createdAt: new Date(),
          });
      
          await newOrder.save();
      
          
          await cart.deleteMany({ userId });
      
          
          return res.status(200).json({message:"Order Placed Successfully!"})
        } catch (error) {
          console.error(error);
          res.status(500).send("Error placing order.");
        }
    },
    loadOrders: async (req,res)=>{
        try {
            const userId=req.session.user;
            const user= await userSchema.findById(userId);
            const orders=await orderSchema.find({userId}).populate('items.product').sort({createdAt:-1})
            res.render("user/orders",{user,orders})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured")
        }
    },
    loadOrderView: async (req, res) => {
        try {
            console.log("Order ID:", req.params.id); 
            const userId = req.session.user;
            const user = await userSchema.findById(userId);
            const orderId = req.params.id;
            const order = await orderSchema.findById({ _id: orderId }).populate('items.product')
            
            console.log("Order:", order);
    
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.render('user/orderView', { user, order: order });
    
        } catch (error) { 
            console.error(error);
            res.status(500).send("An error occurred");
        }
    },
    
    
    //load logout
    loadLogout:(req,res)=>{
        try {
            req.session.destroy();
            res.redirect('/user/login')
        } catch (error) {
            console.log(error)
            res.status(500).send("Error occured")
        }
    }
     
    
};

// function to send otp to email
function sendOtpEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user:process.env.EMAIL, 
            pass:process.env.PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP code is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("error sending email: ",error);
        } else {
            console.log('OTP sent: ', otp );
        }
    }); 

}

