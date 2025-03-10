import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Customer from "../models/customer.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendCustomerConfirmationEmail,
  sendAdminNotificationEmail,
} from "../utils/emailService.js";
import TimeSlot from "../models/timeSlot.model.js";

const checkCustomer = asyncHandler(async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      selectedDate,
      totalPrice,
      selectedTimeSlot,
      makeAndModel,
      registrationNo,
      classSelection,
      paymentMethod,
    } = req.body;
    const OrderId = `ORD- + ${Date.now()}`;
    // Validate required fields based on the schema
    if (
      !firstName ||
      !lastName ||
      !selectedDate ||
      !selectedTimeSlot ||
      !makeAndModel ||
      !registrationNo
    ) {
      throw new ApiError(400, "Required fields are missing.");
    }

    if (!totalPrice || totalPrice === "00.00") {
      throw new ApiError(400, "Please select a valid price.");
    }

    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid date format. Please use YYYY-MM-DD.");
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    if (date.toDateString() === currentDate.toDateString()) {
      throw new ApiError(400, "Bookings for today are not allowed.");
    }
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new ApiError(
        400,
        "Bookings are only allowed from Monday to Friday."
      );
    }

    const formattedDate = date.toISOString().split("T")[0];
    let timeSlot = await TimeSlot.findOne({ date: formattedDate });
    if (timeSlot) {
      const slot = timeSlot.slots.find((s) => s.time === selectedTimeSlot);
      if (slot && (slot.blockedBy || slot.bookedBy)) {
        throw new ApiError(400, "The selected time slot is not available.");
      }
    }

    // // Create and save new customer with 'bookedBy' as 'admin'
    // const newCustomer = new Customer({
    //   firstName,
    //   lastName,
    //   email,
    //   contactNumber,
    //   selectedDate: formattedDate,
    //   selectedTimeSlot,
    //   totalPrice,
    //   makeAndModel,
    //   registrationNo,
    //   paymentStatus: "completed",
    //   totalPrice: totalPrice,
    //   paymentMethod,
    //   bookedBy: "admin",
    //   classSelection,
    //   paypalOrderId: OrderId,
    // });
    // await newCustomer.save();

    // // Update the time slot
    // const slotIndex = timeSlot.slots.findIndex(
    //   (s) => s.time === selectedTimeSlot
    // );
    // if (slotIndex !== -1) {
    //   timeSlot.slots[slotIndex].bookedBy = newCustomer._id;
    // } else {
    //   timeSlot.slots.push({
    //     time: selectedTimeSlot,
    //     bookedBy: newCustomer._id,
    //   });
    // }

    // await timeSlot.save();
    // await sendCustomerConfirmationEmail(newCustomer);
    // // Send notification email to the admin
    // await sendAdminNotificationEmail(newCustomer);

    return res.status(201).json(new ApiResponse(201, {}, "Booking successful"));
  } catch (error) {
    next(error);
  }
});
const createCustomer = asyncHandler(async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      selectedDate,
      totalPrice,
      selectedTimeSlot,
      makeAndModel,
      registrationNo,
      classSelection,
      paymentMethod,
    } = req.body;
    const OrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Validate required fields based on the schema
    if (
      !firstName ||
      !lastName ||
      !selectedDate ||
      !selectedTimeSlot ||
      !makeAndModel ||
      !registrationNo
    ) {
      throw new ApiError(400, "Required fields are missing.");
    }

    if (!totalPrice || totalPrice === "00.00") {
      throw new ApiError(400, "Please select a valid price.");
    }

    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "Invalid date format. Please use YYYY-MM-DD.");
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    if (date.toDateString() === currentDate.toDateString()) {
      throw new ApiError(400, "Bookings for today are not allowed.");
    }
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new ApiError(
        400,
        "Bookings are only allowed from Monday to Friday."
      );
    }

    const formattedDate = date.toISOString().split("T")[0];
    let timeSlot = await TimeSlot.findOne({ date: formattedDate });
    if (timeSlot) {
      const slot = timeSlot.slots.find((s) => s.time === selectedTimeSlot);
      if (slot && (slot.blockedBy || slot.bookedBy)) {
        throw new ApiError(400, "The selected time slot is not available.");
      }
    } else {
      timeSlot = new TimeSlot({ date: formattedDate, slots: [] });
    }

    // Create and save new customer with 'bookedBy' as 'admin'
    const newCustomer = new Customer({
      firstName,
      lastName,
      email,
      contactNumber,
      selectedDate: formattedDate,
      selectedTimeSlot,
      totalPrice,
      makeAndModel,
      registrationNo,
      paymentStatus: "completed",
      totalPrice: totalPrice,
      paymentMethod,
      bookedBy: "customer",
      classSelection,
      paypalOrderId: OrderId,
    });
    await newCustomer.save();

    // Update the time slot
    const slotIndex = timeSlot.slots.findIndex(
      (s) => s.time === selectedTimeSlot
    );
    if (slotIndex !== -1) {
      timeSlot.slots[slotIndex].bookedBy = newCustomer._id;
    } else {
      timeSlot.slots.push({
        time: selectedTimeSlot,
        bookedBy: newCustomer._id,
      });
    }

    await timeSlot.save();
    await sendCustomerConfirmationEmail(newCustomer);
    // // Send notification email to the admin
    await sendAdminNotificationEmail(newCustomer);

    return res
      .status(201)
      .json(
        new ApiResponse(201, { customer: newCustomer }, "Booking successful")
      );
  } catch (error) {
    next(error);
  }
});
const capturePayment = asyncHandler(async (req, res, next) => {
  const captureDetails = req.body;

  // Find the customer based on the PayPal order ID
  const customer = await Customer.findOne({ paypalOrderId: orderID });

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  // Check if payment has already been captured
  if (customer.paymentStatus === "completed") {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { customer }, "Payment has already been captured.")
      );
  }

  try {
    // Process completed payment
    if (status === "COMPLETED") {
      customer.paymentStatus = "completed";
      customer.captureId =
        captureDetails.purchase_units[0].payments.captures[0].id;
      await customer.save();
      const bookingDetails = {
        selectedDate: customer.selectedDate,
        selectedTimeSlot: customer.selectedTimeSlot,
        totalPrice: parseFloat(purchase_units[0].amount.value),
        serviceDescription: `Vehicle: ${customer.makeAndModel}, Registration: ${customer.registrationNo} Class: ${customer.classSelection}`,
        paymentMethod: customer.paymentMethod,
        paymentStatus:
          customer.paymentStatus === "completed" ? "Completed" : "Pending",
      };

      // Send confirmation email to the customer
      // await sendCustomerConfirmationEmail(customer, bookingDetails);

      // // Send notification email to the admin
      // await sendAdminNotificationEmail(
      //   customer,
      //   bookingDetails,
      //   captureDetails
      // );

      console.log(
        `Payment captured successfully for customer: ${customer.email}`
      );
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { captureDetails, customer },
            "Payment captured successfully."
          )
        );
    } else {
      console.log(`Payment capture failed for customer: ${customer.email}`);
      throw new ApiError(400, "Payment capture failed.");
    }
  } catch (error) {
    next(error);
  }
});
const cancelPayment = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  try {
    // Find customer based on booking ID
    const customer = await Customer.findOne({ paypalOrderId: bookingId });
    if (!customer) {
      throw new ApiError(404, "Customer booking not found");
    }

    // Ensure the payment status is 'pending'
    if (customer.paymentStatus !== "pending") {
      throw new ApiError(
        400,
        "This booking's payment has already been processed or cancelled"
      );
    }

    // Delete the customer booking
    await Customer.findByIdAndDelete(customer._id);

    console.log(
      `Payment cancellation processed successfully for customer: ${customer.email}`
    );

    // Extract necessary details for unblocking the time slot
    const { selectedDate, selectedTimeSlot } = customer;

    // Unblock the time slot
    const parsedDate = new Date(selectedDate);
    parsedDate.setUTCHours(0, 0, 0, 0);

    const timeSlot = await TimeSlot.findOne({ date: parsedDate });
    if (!timeSlot) {
      throw new ApiError(404, "No time slots found for the given date.");
    }

    const existingSlot = timeSlot.slots.find(
      (s) => s.time === selectedTimeSlot
    );
    if (!existingSlot) {
      throw new ApiError(
        404,
        `Slot ${selectedTimeSlot} not found on this date.`
      );
    }

    // Unblock the slot by checking `bookedBy` instead of `blockedBy`
    if (existingSlot.bookedBy) {
      existingSlot.bookedBy = null; // Unblock the slot
    } else {
      throw new ApiError(400, `Slot ${selectedTimeSlot} is not blocked.`);
    }

    // Save the updated time slot information
    await timeSlot.save();

    // Send success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { customer, timeSlot },
          "Payment cancellation and time slot unblocking processed successfully."
        )
      );
  } catch (error) {
    console.error("Cancellation error:", error);
    next(error);
  }
});

export { cancelPayment, capturePayment, createCustomer, checkCustomer };
