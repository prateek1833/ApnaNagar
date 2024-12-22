const Orders = require("../models/order");
const User = require("../models/user");

module.exports.index = async (req, res) => {
    const allUser = await User.find({});
    res.render("owner/users.ejs", { allUser });
}
module.exports.renderEdit = async (req, res) => {
    let { id } = req.params;
    const user = await User.findById(id);
    res.render("owner/edit.ejs", { user });
}

module.exports.renderQuantity = async (req, res) => {
    let { id } = req.params;
    const order = await Orders.findById(id);
    res.render("owner/quantity.ejs", { order });
}

module.exports.quantity = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the specific order by ID
        const order = await Orders.findById(id);
        if (!order) {
            req.flash("error", "Order not found");
            return res.redirect("/owner/orders"); // Redirect to orders page or another relevant page
        }

        // Iterate over each order item and update its quantity
        for (let item of order.items) {
            const quantityKey = `quantity_${item._id}`;
            if (req.body[quantityKey]) {
                item.item.quantity = parseFloat(req.body[quantityKey], 10);
            }
        }

        // Save the updated order
        await order.save();

        // Fetch all orders again to pass to the template
        const allOrder = await Orders.find({});

        req.flash("success", "Quantity updated successfully");
        res.render("items/orders.ejs", { allOrder, User });
    } catch (error) {
        console.error('Error updating order quantities:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};


module.exports.status = async (req, res) => {
    const { id } = req.params;
    const { orderStatus } = req.body;
    const allOrder = await Orders.find({});
    try {
        console.log(orderStatus);
        // Validate that the orderStatus is one of the allowed values
        const validStatuses = ['1', '2', '3', '4'];
        if (!validStatuses.includes(orderStatus)) {
            req.flash("warning", "invalid order status");
            res.render("items/orders.ejs", { allOrder,User });
        }

        // Update the order with the new status
        const statusMap = {
            '1': 'Order Processing',
            '2': 'Shipped',
            '3': 'Out for Delivery',
            '4': 'Delivered'
        };

        const updatedOrder = await Orders.findByIdAndUpdate(
            id,
            { status: statusMap[orderStatus] },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).send({ message: 'Order not found' });
        }
        req.flash("success", "status updated");
        return res.render("items/orders.ejs", { allOrder,User });
        // Send the updated order back in the response
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



module.exports.update = async (req, res) => {
    const { id } = req.params;
    let { area, district, state, pincode, balance_due, mobile } = req.body;
    console.log(req.body);

    try {
        let user = await User.findByIdAndUpdate(id, {
            area,
            district,
            state,
            pincode,
            balance_due,
            mobile,
        })

        if (!user) {
            req.flash("error", "User not found");
            return res.redirect(`/owner`);
        }
        req.flash("success", "User Updated");
        return res.redirect(`/owner`);
    } catch (error) {
        console.error("Error updating user:", error);
        req.flash("error", "Error updating user");
        return res.redirect(`/owner`);
    }
}

