const MANAGERS = {
  tommy: {
    name: "Tommy Williams",
    department: "Night Manager",
    email: "tommy@rdentlab.com",
    tasks: {
      daily: [
        { id: "production-analysis", label: "Production Analysis & Review with Technicians", deadline: "7:00 PM", days: ["Mon","Tue","Wed","Thu","Fri"] },
        { id: "cadcam-walkthrough", label: "Final walk-through CADCAM — check mills, printers, oven, shelves for stuck work", deadline: null, days: ["Mon","Tue","Wed","Thu","Fri"] },
        { id: "handoff-cole", label: "Handoff meeting with Cole — discuss any issues", deadline: null, days: ["Mon","Tue","Wed","Thu","Fri"] }
      ],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" }
      ]
    }
  },
  cole: {
    name: "Cole",
    department: "CADCAM Manager",
    email: "cole@rdentlab.com",
    tasks: {
      daily: [
        { id: "production-analysis", label: "Production Analysis & Review with Technicians", deadline: "9:00 AM", days: ["Mon","Tue","Wed","Thu","Fri"] },
        { id: "cadcam-walkthrough", label: "Final walk-through CADCAM — check mills, printers, ovens, shelves for stuck work & review logistical reports", deadline: null, days: ["Mon","Tue","Wed","Thu","Fri"] },
        { id: "handoff-tommy", label: "Handoff meeting with Tommy — discuss any issues", deadline: null, days: ["Mon","Tue","Wed","Thu","Fri"] }
      ],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" },
        { id: "l10-todos-review", label: "Review & complete any to-dos for Monday L10", deadline: "Fri EOD", requiresTimeEntry: false },
        { id: "oqcam-carbon", label: "Unzip & load all Oqcam Carbon files into Carbon portal for the week", deadline: "Fri 12:00 PM", days: ["Fri"], requiresTimeEntry: false }
      ]
    }
  },
  melissa: {
    name: "Melissa",
    department: "Integrator",
    email: "melissa@rdentlab.com",
    tasks: {
      daily: [
        { id: "production-analysis", label: "Production Analysis & Review with Technicians", deadline: "9:00 AM", days: ["Mon","Tue","Wed","Thu","Fri"] }
      ],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" },
        { id: "daxton-catchup", label: "Weekly catch-up meeting with Daxton", deadline: "Fri AM", requiresTimeEntry: false },
        { id: "l10-todos-review", label: "Review & complete any to-dos for Monday L10", deadline: "Fri EOD", requiresTimeEntry: false }
      ]
    }
  },
  greg: {
    name: "Greg",
    department: "Removable Department Manager",
    email: "greg@rdentlab.com",
    tasks: {
      daily: [
        { id: "production-analysis", label: "Production Analysis & Review with Technicians", deadline: "9:00 AM", days: ["Mon","Tue","Wed","Thu","Fri"] }
      ],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" },
        { id: "l10-todos-review", label: "Review & complete any to-dos for Monday L10", deadline: "Fri EOD", requiresTimeEntry: false }
      ]
    }
  },
  melaine: {
    name: "Melaine Copeland",
    department: "Office Manager",
    email: "melaine@rdentlab.com",
    tasks: {
      daily: [],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" }
      ]
    }
  },
  bree: {
    name: "Bree High",
    department: "Sales & Marketing Director",
    email: "bree@rdentlab.com",
    tasks: {
      daily: [],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" }
      ]
    }
  },
  paula: {
    name: "Paula Jackson",
    department: "HR Manager",
    email: "paula@rdentlab.com",
    tasks: {
      daily: [],
      weekly: [
        { id: "l10-weekly", label: "L10 Weekly with team", requiresTimeEntry: true, prompt: "What day and time did you hold the L10?" }
      ]
    }
  },
  amy: {
    name: "Amy Everitt",
    department: "Field Sales Representative",
    email: "",
    startDate: "2026-04-02",
    tasks: {
      daily: [
        { id: "offices-visited", label: "Offices visited today", days: ["Mon","Tue","Wed","Thu"], requiresTimeEntry: true, prompt: "How many offices did you visit today?" },
        { id: "areas-hit", label: "Areas covered today", days: ["Mon","Tue","Wed","Thu"], requiresTimeEntry: true, prompt: "What areas did you hit today?" }
      ],
      weekly: [
        { id: "weekly-office-total", label: "Weekly office visit total (Mon–Thu)", days: ["Fri"], requiresTimeEntry: true, prompt: "Total offices visited this week" },
        { id: "new-doctors", label: "New doctors gained this week", days: ["Fri"], requiresTimeEntry: true, prompt: "How many new doctors this week?" },
        { id: "next-week-plans", label: "Plans for next week sent to Daxton", days: ["Fri"], requiresTimeEntry: false },
        { id: "loops-closed", label: "Loops for week closed up", days: ["Fri"], requiresTimeEntry: false }
      ]
    }
  }
};

const START_DATE = '2026-03-26';

const ADMIN = {
  email: "daxton@rdentlab.com",
  dailySummaryTime: "21:00",
  escalationThreshold: 3
};

module.exports = { MANAGERS, ADMIN, START_DATE };
