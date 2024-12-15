const adminSchema=require("../model/adminModel");
const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema");
const categorySchema=require("../model/categorySchema");
const orderSchema=require('../model/orderSchema');
const bcrypt=require("bcrypt");

module.exports={
    //load admin login
    loadLogin:(req,res)=>{
        try {
            
          res.render('admin/login')  
        } catch (error) {
            res.status(500).send("error occured")
        }
    },

    loadAdmin:async (req,res)=>{
        try {
            const {email,password}=req.body
            console.log(`Email: ${email} , Password: ${password}`)

            const admin = await adminSchema.findOne({email: email})
            if(!admin){
                return res.status(400).json({status:false,message:"Invalid Credentials"})
            }

            const match= await bcrypt.compare(password,admin.password)

            if(!match){
                return res.status(400).json({status:false,message:"Password doesn't match"})
            }
            
            req.session.admin=admin.id;

            return res.status(200).json({status:true,message:"Login successfully"})

        } catch (error) {
            res.status(500).send("Error occured")
        }
    },

    loadDashBoard:(req,res)=>{
        try {
            const admin=req.session.admin
            if(!admin){
                res.redirect('/admin/login')
            }else {
                res.render('admin/dashBoard')
            }
            
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    loadAllProducts:async (req,res)=>{
        try {
            const products= await productSchema.find({isDeleted:false}).populate('category','name')
            res.render("admin/allProducts",{products})
        } catch (error) {
            console.error("Error fetching customers:", error)
            res.status(500).send("Error Occured")
        }
    },

    loadAddProducts:async(req,res)=>{
        try {
            const categories=await categorySchema.find()
            res.render("admin/addProducts",{categories})
        } catch (error) {
            console.error("Error loading addProducts page:", error);
            res.status(500).send("Error loading the page");
        }
    },

    loadEditProducts:async (req,res)=>{
        try {
            const productId=req.params.id;
            
            const product= await productSchema.findById(productId).populate('category','_id name');
            

            if(!product){
                return res.status(404).send("Product not found")
            }
            const categories=await categorySchema.find({isBlock:false})

            console.log("Product:", product);
            console.log("Categories:", categories);

            res.render('admin/editProducts',{product,categories});
        } catch (error) {
            console.error(error);
            res.status(500).send("Error Occured")
        }
    },

    loadAllCategory:async (req,res)=>{
        try {
            const category= await categorySchema.find({})

            res.render("admin/allCategory",{category})
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    loadAddCategory:(req,res)=>{
        try {
            res.render("admin/addCategory")
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    loadEditCategory: async(req,res)=>{
        try {
            const categoryId=req.params.id
            const category=await categorySchema.findById(categoryId)
            
            if(!category){
                res.status(400).send("Category not found")
            }
            res.render('admin/editCategory',{category})
        } catch (error) {
            console.error(error)
            res.status(500).send("Error Occured")
        }
    },

    loadCoustmers: async (req,res)=>{
        try {
            const users= await userSchema.find({})

        res.render("admin/coustmers",{users})
        } catch (error) {
            console.error("Error fetching customers:", error);
            res.status(500).send("Error Occured")
        }
    },
    blockandUnblockuser: async (req,res)=>{
        try {
            const userId = req.params.id;
            const { isBlock } = req.body;

            const user = await userSchema.findByIdAndUpdate(userId, { isBlock }, { new: true });

            if (user) {
                return res.status(200).json({ status: true, message: 'User status updated successfully' });
            }

            res.status(404).json({ status: false, message: 'User not found' });
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },

    blockandUnblockCategory:async (req,res)=>{
        try {
            const categoryId=req.params.id;
            const category=await categorySchema.findById(categoryId)

            if(!category){
                res.status(400).json({status:false,message:"Category not found"})
            }
            category.isBlock=!category.isBlock
            await category.save()

            res.status(200).json({ status: true, message: category.isBlock ? "Category blocked" : "Category unblocked" });
        } catch (error) {
            console.error('Error blocking/unblocking category:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },
    loadDeletedProducts: async (req,res)=>{
        try {
            const products=await productSchema.find({isDeleted:true}).populate('category','name')
            res.render("admin/deletedProducts",{products})
        } catch (error) {
            console.log(error)
            res.status(500).send("Error Occured")
        }
    },
    undoDeleteProducts: async(req,res)=>{
        try {
            const productId = req.params.id;

            const product= await productSchema.findByIdAndUpdate( productId ,{isDeleted:false},{new:true});

            if(product){
                return res.status(200).json({status:true,message:"Undo Delete Successfully"})
            }

            res.status(400).json({status:false,message:"Product not found"});

        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({ status: false, message: 'Internal server error' });
        }
    },
    
    loadOrders:async(req,res)=>{
        try {
            const orders=await orderSchema.find({}).populate("items.product").sort({createdAt:-1})
            console.log(orders)
            res.render('admin/allOrders',{orders})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured :",error)
        }
    },
    loadOrderDetail:async (req,res)=>{
        try {
            const orderId=req.params.id;
            const order=await orderSchema.findById(orderId).populate('items.product')
            res.render('admin/orderDetail',{order})
        } catch (error) {
            console.log(error);
            res.status(500).send("Error Occured :",error)
        }
    },
    updateOrderStatus:async(req,res)=>{
        const { status } = req.body;
        try {
            
            const order = await orderSchema.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true } // Return the updated document
            );

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }
            res.json({ message: "Order status updated successfully", order });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Error updating order status" });
        }
    },
    loadLogout:(req,res)=>{
        try {
            req.session.admin=null;
            res.redirect("/admin/login")
        } catch (error) {
            console.log(error)
            res.status(500).send("Error occured")
        }
    }

    


}


