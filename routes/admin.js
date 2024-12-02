const express=require("express");
const router=express.Router();
const adminController=require("../controller/adminController");
const productController=require('../controller/productController.js');
const categoryController=require("../controller/categoryController.js");
const upload=require('../utils/cloudinary');
const adminAuth=require("../middleware/adminAuth");
//admin login 
router.get('/login',adminAuth.isLogin,adminController.loadLogin);
router.post('/login',adminController.loadAdmin);

//admin dashboard
router.get('/dashBoard',adminAuth.checkSession,adminController.loadDashBoard);

//all products
router.get("/allProducts",adminAuth.checkSession,adminController.loadAllProducts);

//add products
router.get("/addProducts",adminAuth.checkSession,adminController.loadAddProducts);
router.post('/addProducts',upload.array('images',4),productController.addProduct)

//edit products
router.get("/editProducts/:id",adminAuth.checkSession,adminController.loadEditProducts);
//admin post
router.post("/editProducts/:id",upload.array('images',4),productController.updateProducts);

//delete Product
router.delete("/deleteProduct/:id",adminAuth.checkSession,productController.deleteProduct);

//all category
router.get("/allCategory",adminAuth.checkSession,adminController.loadAllCategory);

//add category
router.get("/addCategory",adminAuth.checkSession,adminController.loadAddCategory)
router.post('/addCategory',upload.single("categoryImage") ,categoryController.addCategory)

//edit category
router.get("/editCategory/:id",adminAuth.checkSession,adminController.loadEditCategory)
router.post("/editCategory/:id",upload.single("categoryImage"),categoryController.updateCategory)

//blockandUnblockCatgory
router.post('/block-unblock-category/:id', adminController.blockandUnblockCategory);

// coustmers
router.get("/coustmers",adminAuth.checkSession,adminController.loadCoustmers);
router.put("/users/:id/toggle-block",adminAuth.checkSession,adminController.blockandUnblockuser);

//deleted products
router.get('/deletedProducts',adminAuth.checkSession,adminController.loadDeletedProducts);
router.post('/undo-delete-product/:id',adminController.undoDeleteProducts);

//logout
router.get('/logout',adminAuth.checkSession,adminController.loadLogout);



module.exports=router;