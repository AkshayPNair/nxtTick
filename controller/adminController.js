const adminSchema=require("../model/adminModel");
const userSchema=require("../model/userModel");
const productSchema=require("../model/productSchema");
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

            return res.status(200).json({status:true,message:"Login successfully"})

        } catch (error) {
            res.status(500).send("Error occured")
        }
    },

    loadDashBoard:(req,res)=>{
        try {
            res.render('admin/dashBoard')
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },
    loadAllProducts:async (req,res)=>{
        try {
            const products= await productSchema.find({})
            res.render("admin/allProducts",{products})
        } catch (error) {
            console.error("Error fetching customers:", error)
            res.status(500).send("Error Occured")
        }
    },

    loadAddProducts:(req,res)=>{
        try {
            res.render("admin/addProducts")
        } catch (error) {
            res.status(500).send("Error Occured")
        }
    },

    loadEditProducts:async (req,res)=>{
        try {
            const productId=req.params.id;
            const product= await productSchema.findById(productId);

            if(!product){
                return res.status(404).send("Product not found")
            }
            res.render('admin/editProducts',{product});
        } catch (error) {
            console.error(error);
            res.status(500).send("Error Occured")
        }
    },

    loadAllCategory:(req,res)=>{
        try {
            res.render("admin/allCategory")
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

    loadEditCategory:(req,res)=>{
        try {
            res.render("admin/editCategory")
        } catch (error) {
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

    


}


