import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import TimeSlot from "../models/timeSlot.model.js";

async function getAvailableSlots(date) {
  const timeSlot = await TimeSlot.findOne({ date })
    .populate("slots.bookedBy")
    .populate("slots.blockedBy");

  if (!timeSlot) {
    return "No time slots available for this date.";
  }

  const availableSlots = timeSlot.slots.map((slot) => {
    if (slot.blockedBy) {
      return { time: slot.time, status: "Blocked", blockedBy: slot.blockedBy };
    }
    if (slot.bookedBy) {
      return { time: slot.time, status: "Booked", bookedBy: slot.bookedBy };
    }
    return { time: slot.time, status: "Available" };
  });
  console.log("avddd", availableSlots);

  return availableSlots;
}
const DEFAULT_TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  // "13:00",
  "14:00",
  "15:00",
  "16:00",
  // "17:00",
];
const getAvailableSlotsForDate = async (date) => {
  const timeSlot = await TimeSlot.findOne({ date });

  return DEFAULT_TIME_SLOTS.map((slotTime) => {
    const existingSlot = timeSlot?.slots.find((s) => s.time === slotTime);

    if (existingSlot) {
      if (existingSlot.bookedBy)
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      if (existingSlot.blockedBy)
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
    }

    return { time: slotTime, status: "Available" };
  });
};
const getAvailableTimeSlotsForForm = asyncHandler(async (req, res) => {
  console.log("testing");

  const { date } = req.query;
  if (!date) throw new ApiError(400, "Date is required.");

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0); // Normalize the date

  const slotsWithStatus = await getAvailableSlotsForDate(parsedDate);
  res
    .status(200)
    .json(
      new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
    );
});
const getDisabledDates = asyncHandler(async (req, res) => {
  const { year, month } = req.query; // Expecting a single year and month per request

  if (!year || !month) {
    throw new ApiError(400, "Year aur month required hai.");
  }

  // Convert the received month and year into numbers
  const startMonth = parseInt(month, 10);
  const startYear = parseInt(year, 10);

  // Initialize an empty array to hold the disabled dates for all three months
  let allDisabledDates = [];

  // Loop through the 3 months: one month before, the given month, and the next month
  for (let i = -1; i <= 1; i++) {
    // Calculate the current month and year
    const currentMonth = ((startMonth + i - 1) % 12) + 1; // Get the correct month (adjust for 1-12 range)
    const currentYear = startYear + Math.floor((startMonth + i - 1) / 12); // Adjust year if month goes beyond December

    // Calculate the start and end dates of the month (in UTC)
    const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1)); // Start of the month in UTC
    const endDate = new Date(Date.UTC(currentYear, currentMonth, 0)); // End of the month in UTC

    console.log(`Fetching disabled dates for ${currentMonth}/${currentYear}:`);
    console.log("Start Date:", startDate.toISOString()); // Log the start date
    console.log("End Date:", endDate.toISOString()); // Log the end date

    // Perform the aggregation pipeline to fetch the disabled dates
    const disabledDates = await TimeSlot.aggregate([
      {
        $match: {
          date: {
            $gte: startDate, // Compare using UTC date
            $lte: endDate,
          },
        },
      },
      // Add fields to calculate totalSlots and unavailableSlots
      {
        $addFields: {
          totalSlots: { $size: { $ifNull: ["$slots", []] } }, // Count all slots
          unavailableSlots: {
            $size: {
              $filter: {
                input: { $ifNull: ["$slots", []] }, // Ensure slots array is not null
                as: "slot",
                cond: { $ne: ["$$slot.blockedBy", null] }, // Count only blocked slots
              },
            },
          },
        },
      },
      // Debug: Check the output of the added fields
      {
        $project: {
          date: 1,
          totalSlots: 1,
          unavailableSlots: 1,
          _id: 0,
        },
      },
      // Match: Make sure the total number of slots equals the number of unavailable slots (fully blocked day)
      {
        $match: {
          $expr: {
            $eq: ["$totalSlots", 8], // Match the number of time slots in the day (8 slots)
            $eq: ["$totalSlots", "$unavailableSlots"], // Ensure all slots are unavailable
          },
        },
      },
      // Final projection to return only the date field
      {
        $project: {
          date: 1,
          _id: 0,
        },
      },
    ]);

    // Combine the result with the overall array
    allDisabledDates = [...allDisabledDates, ...disabledDates];
  }

  // Log the final disabled dates result
  console.log("All Disabled Dates:", allDisabledDates);

  // Return the response with all the disabled dates for the provided months
  res.json(
    new ApiResponse(
      200,
      allDisabledDates,
      "Disabled dates fetched successfully for the previous, current, and next months"
    )
  );
});

// const getDisabledDates = asyncHandler(async (req, res) => {
//   const { year, month } = req.query;

//   if (!year || !month) {
//     throw new ApiError(400, "Year aur month required hai.");
//   }

//   // Calculate the start and end dates of the month (in UTC)
//   const startDate = new Date(Date.UTC(year, month - 1, 1)); // Start of the month in UTC
//   const endDate = new Date(Date.UTC(year, month, 0)); // End of the month in UTC

//   console.log("Start Date:", startDate.toISOString());  // Log the start date
//   console.log("End Date:", endDate.toISOString());      // Log the end date

//   // Perform the aggregation pipeline
//   const disabledDates = await TimeSlot.aggregate([
//     {
//       $match: {
//         date: {
//           $gte: startDate,  // Compare using UTC date
//           $lte: endDate,
//         },
//       },
//     },
//     // Add fields to calculate totalSlots and unavailableSlots
//     {
//       $addFields: {
//         totalSlots: { $size: { $ifNull: ["$slots", []] } }, // Count all slots
//         unavailableSlots: {
//           $size: {
//             $filter: {
//               input: { $ifNull: ["$slots", []] }, // Ensure slots array is not null
//               as: "slot",
//               cond: { $ne: ["$$slot.blockedBy", null] }, // Count only blocked slots
//             },
//           },
//         },
//       },
//     },
//     // Debug: Check the output of the added fields
//     {
//       $project: {
//         date: 1,
//         totalSlots: 1,
//         unavailableSlots: 1,
//         _id: 0,
//       },
//     },
//     // Match: Make sure the total number of slots equals the number of unavailable slots (fully blocked day)
//     {
//       $match: {
//         $expr: {
//           $eq: ["$totalSlots", 8], // Match the number of time slots in the day (8 slots)
//           $eq: ["$totalSlots", "$unavailableSlots"], // Ensure all slots are unavailable
//         },
//       },
//     },
//     // Final projection to return only the date field
//     {
//       $project: {
//         date: 1,
//         _id: 0,
//       },
//     },
//   ]);

//   // Log the final disabled dates result
//   console.log("Disabled Dates:", disabledDates);

//   res.json(
//     new ApiResponse(200, disabledDates, "Disabled dates fetched successfully")
//   );
// });

// const getDisabledDates = asyncHandler(async (req, res) => {
//   const { year, month } = req.query;

//   if (!year || !month) {
//     throw new ApiError(400, "Year aur month required hai.");
//   }

//   const startDate = new Date(year, month - 1, 1);
//   const endDate = new Date(year, month, 0);
//   console.log("Start Date:", startDate);
//   console.log("End Date:", endDate);

//   const disabledDates = await TimeSlot.aggregate([
//     {
//       $match: {
//         date: {
//           $gte: startDate,
//           $lte: endDate,
//         },
//       },
//     },
//     {
//       $addFields: {
//         totalSlots: { $size: { $ifNull: ["$slots", []] } },
//         unavailableSlots: {
//           $size: {
//             $filter: {
//               input: { $ifNull: ["$slots", []] },
//               as: "slot",
//               cond: { $ne: ["$$slot.blockedBy", null] },
//             },
//           },
//         },
//       },
//     },
//     {
//       $match: {
//         $expr: {
//           $and: [
//             { $eq: ["$totalSlots", { $literal: DEFAULT_TIME_SLOTS.length }] },
//             { $eq: ["$totalSlots", "$unavailableSlots"] },
//           ],
//         },
//       },
//     },
//     {
//       $project: {
//         date: 1,
//         _id: 0,
//       },
//     },
//   ]);

//   console.log("Disabled Dates:", disabledDates); // Debugging line to check output

//   res.json(
//     new ApiResponse(200, disabledDates, "Disabled dates fetched successfully")
//   );
// });
const blockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;
  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to block."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Find the time slot for the given date
  let timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    // If no time slot exists for the date, create a new one
    timeSlot = new TimeSlot({ date: parsedDate, slots: [] });
  }

  // Check and block the requested slots
  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        throw new ApiError(
          400,
          `Slot ${slot} is already booked and cannot be blocked.`
        );
      }
      if (existingSlot.blockedBy) {
        throw new ApiError(400, `Slot ${slot} is already blocked.`);
      }
      existingSlot.blockedBy = req.user._id; // Track who blocked it
    } else {
      // If the slot doesn't exist, create it as blocked
      timeSlot.slots.push({ time: slot, blockedBy: req.user._id });
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots blocked successfully"));
});
const unblockTimeSlots = asyncHandler(async (req, res) => {
  const { date, slots } = req.body;

  if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
    throw new ApiError(
      400,
      "Invalid input. Please provide a date and an array of slots to unblock."
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  if (!timeSlot) {
    throw new ApiError(404, "No time slots found for the given date.");
  }

  slots.forEach((slot) => {
    const existingSlot = timeSlot.slots.find((s) => s.time === slot);

    if (!existingSlot) {
      throw new ApiError(404, `Slot ${slot} not found on this date.`);
    }

    // Check if the slot is blocked
    if (existingSlot.blockedBy) {
      if (String(existingSlot.blockedBy) !== String(req.user._id)) {
        throw new ApiError(403, "You cannot unblock a slot you didn't block.");
      }
      // Unblock the slot
      existingSlot.blockedBy = null;
    } else {
      throw new ApiError(400, `Slot ${slot} is not blocked.`);
    }
  });

  await timeSlot.save();
  res.json(new ApiResponse(200, timeSlot, "Time slots unblocked successfully"));
});
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const { date } = req.query; // Date ko query parameter se lete hain

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  // Default time slots
  const defaultSlots = [
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
  ];

  // Fetch time slots for the given date
  const timeSlot = await TimeSlot.findOne({ date: parsedDate });

  // Initialize slots with their statuses
  const slotsWithStatus = defaultSlots.map((slotTime) => {
    const existingSlot = timeSlot
      ? timeSlot.slots.find((s) => s.time === slotTime)
      : null;

    if (existingSlot) {
      if (existingSlot.bookedBy) {
        return {
          time: slotTime,
          status: "Booked",
          bookedBy: existingSlot.bookedBy,
        };
      }
      if (existingSlot.blockedBy) {
        return {
          time: slotTime,
          status: "Blocked",
          blockedBy: existingSlot.blockedBy,
        };
      }
    }

    return { time: slotTime, status: "Available" };
  });

  res.json(
    new ApiResponse(200, slotsWithStatus, "Time slots fetched successfully")
  );
});

export {
  blockTimeSlots,
  unblockTimeSlots,
  getAvailableTimeSlots,
  getAvailableTimeSlotsForForm,
  getDisabledDates,
};
