import mongoose from "mongoose";
const customerSchema = new mongoose.Schema(
  {
    customerName: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    contactNumber: { type: String, required: true },
    selectedDate: { type: Date, required: true },
    totalPrice: { type: String },
    selectedTimeSlot: {
      type: String,
      enum: [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        // "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
      ],
      required: true,
    },
    classSelection: {
      type: String,
      enum: ["class4", "class7"],
      required: true,
    },
    makeAndModel: { type: String, required: true },
    registrationNo: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["Payment on the day", "Cash"],
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paypalOrderId: {
      type: String,
    },
    captureId: {
      type: String,
      required: false,
    },
    refundId: {
      type: String,
      required: false,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
    },
    refundAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    refundReason: {
      type: String,
      required: false,
    },
    refundDate: {
      type: Date,
      required: false,
    },
    bookedBy: {
      type: String,
      enum: ["admin", "customer"],
    },
  },
  { timestamps: true }
);
customerSchema.pre("save", function (next) {
  this.customerName = this.firstName + " " + this.lastName;
  next();
});
const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
