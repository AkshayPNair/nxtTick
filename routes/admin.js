const express=require("express")
const router=express.Router();
const adminController=require("../controller/adminController");
const productController=require('../controller/productController.js')
const upload=require('../utils/cloudinary')
//admin login 
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.loadAdmin);

//admin dashboard
router.get('/dashBoard',adminController.loadDashBoard);

//all products
router.get("/allProducts",adminController.loadAllProducts);

//add products
router.get("/addProducts",adminController.loadAddProducts);
router.post('/addProducts',upload.array('images',4),productController.addProduct)

//edit products
router.get("/editProducts/:id",adminController.loadEditProducts);
//admin post
router.post("/editProducts/:id",productController.updateProducts);

//all category
router.get("/allCategory",adminController.loadAllCategory);

//add category
router.get("/addCategory",adminController.loadAddCategory)

//edit category
router.get("/editCategory",adminController.loadEditCategory)

// coustmers
router.get("/coustmers",adminController.loadCoustmers);



module.exports=router;