module.exports={
    checkSession: (req,res,next)=>{
        if(req.session && req.session.admin){
            next()
        }else{
            res.redirect('/admin/login')
        }
    },
    isLogin:(req,res,next)=>{
        if(req.session && req.session.admin){
            res.redirect('/admin/dashBoard')
        }else{
            next()
        }
    }
}