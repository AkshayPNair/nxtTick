const productSchema=require("../model/productSchema.js")
module.exports={
    addProduct:async (req,res)=>{
        try {
            const{productName,description,category,brand,stock,price}=req.body;
            const images=req.files.map((file)=>file.path)
            const newProduct= new productSchema({
              name:productName,
              description:description,
              category:category,
              brand:brand,
              stock:stock,
              price:price,
              images:images
            })
            const saveProduct= await newProduct.save()

            if(saveProduct){
                console.log(saveProduct);
                return res.status(200).json({status:true,message:"Product added successfully!"})
            }
            
            
        } catch (error) {
            res.status(400).json({status:false,message:"Error Occured"})
        }
    },

    updateProducts: async(req,res)=>{
        try {
            const productId=req.params.id;
            const{productName,description,category,brand,stock,price}=req.body;

            const updateProduts= await productSchema.findByIdAndUpdate(
                productId,
                {name:productName,
                description:description,
                category:category,
                brand:brand,
                stock:stock,
                price:price},
                {new:true}
            );
            

            if(!updateProduts){
                return res.status(404).send("Product not found");
            }

            return res.status(200).json({ status:true,message:"Product updated Successfully!"})
        } catch (error) {
            console.error(err);
            res.status(500).json({status:false,message:"Server error"})
        }
    }
}