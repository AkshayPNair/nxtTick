const categorySchema=require("../model/categorySchema")

module.exports={
    addCategory: async (req,res)=>{
        try {
            const {categoryName,description}=req.body;
            const categoryImage=req.file.path

            const newCategory = new categorySchema({
                name:categoryName,
                description:description,
                image:categoryImage,
            });

            const saveCategory = await newCategory.save();
            console.log(saveCategory)

            res.status(200).json({status:true,isBlock:false,message:"Category added Successfully!"})
            

        } catch (error) {
            console.log(error)
            res.status(400).json({status:false,message:"Error adding category"})
        }
    },

    updateCategory: async (req,res)=>{
       try {
        const categoryId=req.params.id;
        const {categoryName,description}=req.body;

       
        
        const updates={
            name:categoryName,
            description:description,
            updatedAt:Date.now(),
        };
        if (req.file ) {
            updates.image = `/uploads/${req.file.filename}`; 
        }
        const updateCategory= await categorySchema.findByIdAndUpdate(
            categoryId,
            updates,
            {new:true}
        )
        if(!updateCategory){
           return res.status(400).json({status:false,isBlock:true,message:"Error Updating Product"})
        }
        console.log("Updated Category :",updateCategory)
        return res.status(200).json({status:true,isBlock:false,message:"Category Updated Successfully!"})
        
       } catch (error) {
          console.error(error);
          res.status(500).json({status:false,isBlock:true,message:"Server error occured"})
       }

        
    }
}