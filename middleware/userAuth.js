const userSchema = require("../model/userModel");

module.exports = {
    checkSession: async (req, res, next) => {
        try {
            if (req.session && req.session.user) {
                const user = await userSchema.findById(req.session.user);
                
                if (!user) {
                    delete req.session.user;
                    return res.redirect('/user/login');
                }
                next();
            } else {
                res.redirect('/user/login');
            }
        } catch (error) {
            console.error("Session check error:", error);
            delete req.session.user;
            res.redirect('/user/login');
        }
    },

    checkBlockStatus: async (req, res, next) => {
        try {
            if (req.session && req.session.user) {
                const user = await userSchema.findById(req.session.user);
                
                if (user && user.isBlock) {
                    delete req.session.user;
                    return res.redirect('/user/login');
                }
                next();
            } else {
                next();
            }
        } catch (error) {
            console.error("Block status check error:", error);
            next();
        }
    },

    isLogin: (req, res, next) => {
        if (req.session && req.session.user) {
            res.redirect('/user/home');
        } else {
            next();
        }
    },

    clearCheckoutCoupon: (req, res, next) => {
        if (req.path !== '/checkout' && req.session.checkoutCoupon) {
            delete req.session.checkoutCoupon;
        }
        next();
    }
};
  