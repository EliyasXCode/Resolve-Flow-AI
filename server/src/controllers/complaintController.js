import Complaint from '../models/Complaint.js';
import Order from '../models/Order.js';
import { createComplaintSchema, updateComplaintStatusSchema } from '../validators/complaintValidator.js';

export const createComplaint = async (req, res, next) => {
  try {
    const validatedData = createComplaintSchema.parse(req.body);

    // Verify order ownership if orderId is supplied
    if (validatedData.orderId) {
      const order = await Order.findById(validatedData.orderId);
      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Referenced order not found.',
        });
      }

      if (order.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Order ownership verification failed. You can only file complaints for your own orders.',
        });
      }
    }

    const complaint = await Complaint.create({
      customerId: req.user._id,
      title: validatedData.title,
      description: validatedData.description,
      orderId: validatedData.orderId || null,
      category: validatedData.category || 'UNSPECIFIED',
      status: 'SUBMITTED',
      attachments: [],
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('orderId')
      .populate('customerId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      complaint: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaints = async (req, res, next) => {
  try {
    const query = {};

    // Customer isolation: Customers can ONLY see their own complaints
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    } else {
      // Support and Admin filters
      if (req.query.status) {
        query.status = req.query.status;
      }
      if (req.query.category) {
        query.category = req.query.category;
      }
      if (req.query.priority) {
        query.priority = req.query.priority;
      }
      if (req.query.search) {
        query.$or = [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
        ];
      }
    }

    const complaints = await Complaint.find(query)
      .populate('orderId', 'orderNumber totalAmount deliveryDate status')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('orderId')
      .populate('customerId', 'name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    // Customer isolation check
    if (
      req.user.role === 'customer' &&
      complaint.customerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this complaint.',
      });
    }

    res.status(200).json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

export const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status } = updateComplaintStatusSchema.parse(req.body);

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
    }

    complaint.status = status;
    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
};
