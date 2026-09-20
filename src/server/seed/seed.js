require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Issue = require('../models/Issue');
const Assignment = require('../models/Assignment');
const IssueUpdate = require('../models/IssueUpdate');
const Escalation = require('../models/Escalation');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civictrack';

// CRITICAL PRODUCTION SAFETY GUARD
if (process.env.NODE_ENV === 'production') {
  console.error('================================================================================');
  console.error('CRITICAL ERROR: Database seeding is STRICTLY PROHIBITED in production mode!');
  console.error('Seeding wipes existing collections, users, issues, and audit records.');
  console.error('Aborting immediately.');
  console.error('================================================================================');
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log(`[CivicTrack Seed] Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URI);
    console.log('[CivicTrack Seed] Connected to MongoDB.');

    // 1. Clear existing database collections
    console.log('[CivicTrack Seed] Clearing old collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Issue.deleteMany({}),
      Assignment.deleteMany({}),
      IssueUpdate.deleteMany({}),
      Escalation.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Counter.deleteMany({})
    ]);

    // Initialize Case ID Counter past seeded cases (seeded cases end around 135)
    await Counter.create({ name: 'caseId_2026', seq: 200 });

    // 2. Create Departments
    console.log('[CivicTrack Seed] Creating municipal departments...');
    const departments = await Department.create([
      {
        name: 'Solid Waste Management',
        code: 'SAN',
        description: 'Municipal waste collection, roadside clearance, segregation and recycling operations.',
        slaHours: { P1: 4, P2: 24, P3: 48, P4: 120 },
        contactEmail: 'sanitation@mysuru-civic.gov.in',
        contactPhone: '+91 821 2418801'
      },
      {
        name: 'Roads & Traffic Infrastructure',
        code: 'ROA',
        description: 'Pothole remediation, road resurfacing, kerb maintenance and pedestrian infrastructure.',
        slaHours: { P1: 6, P2: 24, P3: 72, P4: 168 },
        contactEmail: 'roads@mysuru-civic.gov.in',
        contactPhone: '+91 821 2418802'
      },
      {
        name: 'Drainage & Stormwater Sewerage',
        code: 'DRA',
        description: 'Stormwater canal desilting, culvert unblocking, sewer overflows and drain cover repairs.',
        slaHours: { P1: 4, P2: 18, P3: 48, P4: 120 },
        contactEmail: 'drainage@mysuru-civic.gov.in',
        contactPhone: '+91 821 2418803'
      },
      {
        name: 'Streetlighting & Electrical',
        code: 'ELE',
        description: 'Public luminaire maintenance, LED streetlight replacement, feeder pillar repairs and electrical safety.',
        slaHours: { P1: 4, P2: 12, P3: 36, P4: 96 },
        contactEmail: 'electrical@mysuru-civic.gov.in',
        contactPhone: '+91 821 2418804'
      }
    ]);

    const [deptSan, deptRoa, deptDra, deptEle] = departments;

    // 3. Create Demo Users
    console.log('[CivicTrack Seed] Creating demo users...');
    // Password for all demo accounts is established in accordance with requirements
    const usersData = [
      {
        name: 'Rajesh Kumar (City Admin)',
        email: 'admin@civictrack.local',
        password: 'Admin@123',
        role: 'ADMIN',
        phone: '+91 98450 11001'
      },
      {
        name: 'Dr. Ramesh Rao (Sanitation Supervisor)',
        email: 'supervisor@civictrack.local',
        password: 'Supervisor@123',
        role: 'SUPERVISOR',
        department: deptSan._id,
        phone: '+91 98450 11002'
      },
      {
        name: 'Rahul Sharma (Operations Officer)',
        email: 'officer@civictrack.local',
        password: 'Officer@123',
        role: 'OFFICER',
        department: deptSan._id,
        phone: '+91 98450 11003'
      },
      {
        name: 'Manjunath Gowda (Field Worker)',
        email: 'worker@civictrack.local',
        password: 'Worker@123',
        role: 'FIELD_WORKER',
        department: deptSan._id,
        phone: '+91 98450 11004'
      },
      {
        name: 'Priya Sundaram (Citizen)',
        email: 'citizen@civictrack.local',
        password: 'Citizen@123',
        role: 'CITIZEN',
        phone: '+91 98450 11005'
      },
      // Additional field workers & officers
      {
        name: 'Anil Kumar (Roads Crew Lead)',
        email: 'worker.roads@civictrack.local',
        password: 'Worker@123',
        role: 'FIELD_WORKER',
        department: deptRoa._id,
        phone: '+91 98450 11006'
      },
      {
        name: 'Suresh Patil (Electrical Engineer)',
        email: 'worker.electrical@civictrack.local',
        password: 'Worker@123',
        role: 'FIELD_WORKER',
        department: deptEle._id,
        phone: '+91 98450 11007'
      },
      {
        name: 'Venkatesh Murthy (Drainage Lead)',
        email: 'worker.drainage@civictrack.local',
        password: 'Worker@123',
        role: 'FIELD_WORKER',
        department: deptDra._id,
        phone: '+91 98450 11008'
      },
      {
        name: 'Deepa Narayan (Infrastructure Officer)',
        email: 'officer.roads@civictrack.local',
        password: 'Officer@123',
        role: 'OFFICER',
        department: deptRoa._id,
        phone: '+91 98450 11009'
      },
      {
        name: 'Siddharth Joshi (Citizen)',
        email: 'citizen2@civictrack.local',
        password: 'Citizen@123',
        role: 'CITIZEN',
        phone: '+91 98450 11010'
      }
    ].map(u => ({ ...u, status: 'ACTIVE', accountStatus: 'ACTIVE', isVerified: true }));

    const users = await User.create(usersData);

    const [adminUser, supvUser, officerUser, workerSan, citizenPriya, workerRoa, workerEle, workerDra, officerRoa, citizenSiddharth] = users;

    // Link Head Officers to Departments
    deptSan.headOfficer = supvUser._id;
    await deptSan.save();
    deptRoa.headOfficer = officerRoa._id;
    await deptRoa.save();
    deptDra.headOfficer = supvUser._id;
    await deptDra.save();
    deptEle.headOfficer = officerUser._id;
    await deptEle.save();

    // 4. Create 38 Realistic Civic Issues across Mysuru
    console.log('[CivicTrack Seed] Generating realistic civic cases in Mysuru...');

    const now = new Date();
    const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
    const hoursAhead = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);

    const issueDefinitions = [
      // 1. REPORTED - Fresh P1 Critical Issue
      {
        caseId: 'CT-2026-000101',
        title: 'Hazardous hospital waste dumping adjacent to primary school',
        description: 'Untreated biomedical and plastic waste dumped openly on the sidewalk near St. Joseph Primary School. Poses severe biohazard risk to passing children.',
        category: 'Sanitation & Waste',
        department: deptSan._id,
        reportedBy: citizenPriya._id,
        priority: 'P1',
        status: 'REPORTED',
        location: {
          address: 'Opposite St. Joseph School, Vijayanagar 2nd Stage',
          ward: 'Ward 11 - Vijayanagar North',
          landmark: 'Near Water Tank',
          coordinates: { lat: 12.3365, lng: 76.6120 }
        },
        sla: {
          startedAt: hoursAgo(1.5),
          dueAt: hoursAhead(2.5), // P1 is 4h -> 2.5h left (ON_TRACK)
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-dumping.svg',
          path: '/uploads/before-dumping.svg',
          mimeType: 'image/svg+xml',
          size: 15400,
          uploadedBy: citizenPriya._id
        }]
      },

      // 2. UNDER_REVIEW - P2 at Vijayanagar
      {
        caseId: 'CT-2026-000102',
        title: 'Overflowing commercial garbage bins outside vegetable market',
        description: 'Waste has not been cleared for 3 consecutive days. Stray cattle and dogs scattering rotting refuse across the main thoroughfare.',
        category: 'Sanitation & Waste',
        department: deptSan._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P2',
        status: 'UNDER_REVIEW',
        location: {
          address: 'Vegetable Market Complex, Vijayanagar 3rd Stage',
          ward: 'Ward 12 - Vijayanagar South',
          landmark: 'Beside Cauvery Grameena Bank',
          coordinates: { lat: 12.3310, lng: 76.6080 }
        },
        sla: {
          startedAt: hoursAgo(6),
          dueAt: hoursAhead(18),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-dumping.svg',
          path: '/uploads/before-dumping.svg',
          mimeType: 'image/svg+xml',
          size: 15400,
          uploadedBy: citizenSiddharth._id
        }]
      },

      // 3. ASSIGNED - P1 Pothole on Hebbal Ring Road (Awaiting Worker Ack)
      {
        caseId: 'CT-2026-000103',
        title: 'Deep crater pothole causing two-wheeler skids on Ring Road',
        description: 'Severe 1.2m wide, 20cm deep pothole in the rapid transit lane after heavy rains. Multiple motorists thrown off vehicles last night.',
        category: 'Roads & Infrastructure',
        department: deptRoa._id,
        assignedTo: workerRoa._id,
        reportedBy: citizenPriya._id,
        priority: 'P1',
        status: 'ASSIGNED',
        location: {
          address: 'Hebbal Outer Ring Road Junction, near Infosys Gate 2',
          ward: 'Ward 31 - Hebbal Industrial',
          landmark: 'Opposite L&T Infotech',
          coordinates: { lat: 12.3650, lng: 76.5920 }
        },
        sla: {
          startedAt: hoursAgo(2),
          dueAt: hoursAhead(4),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-pothole.svg',
          path: '/uploads/before-pothole.svg',
          mimeType: 'image/svg+xml',
          size: 18200,
          uploadedBy: citizenPriya._id
        }]
      },

      // 4. ACKNOWLEDGED - P2 Streetlight failure in Gokulam
      {
        caseId: 'CT-2026-000104',
        title: 'Entire row of 8 streetlights dark on 3rd Main Road',
        description: 'Complete blackout between 8th Cross and 12th Cross Gokulam. Dark stretch encourages anti-social activities and chain snatching.',
        category: 'Streetlights & Electrical',
        department: deptEle._id,
        assignedTo: workerEle._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P2',
        status: 'ACKNOWLEDGED',
        acknowledgedAt: hoursAgo(1),
        location: {
          address: '3rd Main Road, Gokulam 2nd Stage',
          ward: 'Ward 7 - Gokulam',
          landmark: 'Near Doctors Corner',
          coordinates: { lat: 12.3280, lng: 76.6320 }
        },
        sla: {
          startedAt: hoursAgo(4),
          dueAt: hoursAhead(8),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-light.svg',
          path: '/uploads/before-light.svg',
          mimeType: 'image/svg+xml',
          size: 14200,
          uploadedBy: citizenSiddharth._id
        }]
      },

      // 5. IN_PROGRESS - P1 Roadside Waste Clearing (Sanitation Worker Active)
      {
        caseId: 'CT-2026-000105',
        title: 'Construction debris and domestic refuse blocked pavement',
        description: 'Over 3 tonnes of concrete rubble and decayed domestic waste blocking pedestrian passage and open gutter.',
        category: 'Sanitation & Waste',
        department: deptSan._id,
        assignedTo: workerSan._id,
        reportedBy: citizenPriya._id,
        priority: 'P1',
        status: 'IN_PROGRESS',
        acknowledgedAt: hoursAgo(2.5),
        workStartedAt: hoursAgo(1.2),
        location: {
          address: 'Kuvempunagar Double Road, near Complex',
          ward: 'Ward 18 - Kuvempunagar North',
          landmark: 'Opposite Navkis Educational Centre',
          coordinates: { lat: 12.2920, lng: 76.6270 }
        },
        sla: {
          startedAt: hoursAgo(3),
          dueAt: hoursAhead(1), // 1 hour left of 4 hours -> AT RISK!
          status: 'AT_RISK'
        },
        attachments: [{
          filename: 'before-dumping.svg',
          path: '/uploads/before-dumping.svg',
          mimeType: 'image/svg+xml',
          size: 15400,
          uploadedBy: citizenPriya._id
        }]
      },

      // 6. RESOLUTION_SUBMITTED / VERIFICATION_REQUIRED - Ready for Officer inspection!
      {
        caseId: 'CT-2026-000106',
        title: 'Choked storm drain flooding Saraswathipuram 5th Main',
        description: 'Stormwater overflow entering residential compounds. Silt, plastic bags and tree branches choking the underground culvert.',
        category: 'Drainage & Sewage',
        department: deptDra._id,
        assignedTo: workerDra._id,
        reportedBy: citizenPriya._id,
        priority: 'P2',
        status: 'VERIFICATION_REQUIRED',
        acknowledgedAt: hoursAgo(10),
        workStartedAt: hoursAgo(7),
        location: {
          address: '5th Main, Saraswathipuram',
          ward: 'Ward 15 - Saraswathipuram',
          landmark: 'Near Marimallappa College',
          coordinates: { lat: 12.3080, lng: 76.6340 }
        },
        sla: {
          startedAt: hoursAgo(12),
          dueAt: hoursAhead(6),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-drain.svg',
          path: '/uploads/before-drain.svg',
          mimeType: 'image/svg+xml',
          size: 16500,
          uploadedBy: citizenPriya._id
        }],
        resolution: {
          notes: 'Culvert cleared using vacuum desilting suction truck. 1.8 tonnes of muck removed, water flow completely normalized.',
          beforeImages: ['/uploads/before-drain.svg'],
          afterImages: ['/uploads/after-drain.svg'],
          completionRemarks: 'Culvert reinforced and concrete grating cleaned.',
          submittedBy: workerDra._id,
          submittedAt: hoursAgo(1),
          verificationStatus: 'PENDING'
        }
      },

      // 7. RESOLVED - Awaiting Citizen Confirmation
      {
        caseId: 'CT-2026-000107',
        title: 'Damaged street luminaire pole with sparking terminal box',
        description: 'Exposed live wire hanging 4 feet above sidewalk after delivery truck impact. High risk of electrical shock.',
        category: 'Streetlights & Electrical',
        department: deptEle._id,
        assignedTo: workerEle._id,
        reportedBy: citizenPriya._id,
        priority: 'P1',
        status: 'RESOLVED',
        acknowledgedAt: hoursAgo(8),
        workStartedAt: hoursAgo(6),
        resolvedAt: hoursAgo(1.5),
        location: {
          address: 'Kalidasa Road, Jayalakshmipuram',
          ward: 'Ward 9 - Jayalakshmipuram',
          landmark: 'Near Loyal World Supermarket',
          coordinates: { lat: 12.3210, lng: 76.6310 }
        },
        sla: {
          startedAt: hoursAgo(8),
          dueAt: hoursAgo(4), // Completed within window
          status: 'COMPLETED'
        },
        attachments: [{
          filename: 'before-light.svg',
          path: '/uploads/before-light.svg',
          mimeType: 'image/svg+xml',
          size: 14200,
          uploadedBy: citizenPriya._id
        }],
        resolution: {
          notes: 'Defective pole junction re-insulated, high-efficiency 120W LED fixture fitted and secured.',
          beforeImages: ['/uploads/before-light.svg'],
          afterImages: ['/uploads/after-light.svg'],
          completionRemarks: 'Earthing resistance measured at 2.1 ohms. Safe for pedestrians.',
          submittedBy: workerEle._id,
          submittedAt: hoursAgo(2),
          verifiedBy: officerUser._id,
          verifiedAt: hoursAgo(1.5),
          verificationStatus: 'APPROVED'
        },
        citizenFeedback: {
          confirmed: null,
          confirmedAt: null
        }
      },

      // 8. CLOSED - Successfully verified by citizen
      {
        caseId: 'CT-2026-000108',
        title: 'Asphalt cavity and broken sub-base on Bannimantap Main Road',
        description: 'Sub-surface subsidence created a dangerous 4-inch step in the road profile near HUDCO Colony.',
        category: 'Roads & Infrastructure',
        department: deptRoa._id,
        assignedTo: workerRoa._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P2',
        status: 'CLOSED',
        acknowledgedAt: hoursAgo(40),
        workStartedAt: hoursAgo(30),
        resolvedAt: hoursAgo(8),
        closedAt: hoursAgo(4),
        location: {
          address: 'Bannimantap ' + 'A' + ' Layout, near Torchlight Parade Grounds',
          ward: 'Ward 24 - Bannimantap',
          landmark: 'Opposite KSRTC Depot',
          coordinates: { lat: 12.3390, lng: 76.6540 }
        },
        sla: {
          startedAt: hoursAgo(42),
          dueAt: hoursAgo(18),
          status: 'COMPLETED'
        },
        attachments: [{
          filename: 'before-pothole.svg',
          path: '/uploads/before-pothole.svg',
          mimeType: 'image/svg+xml',
          size: 18200,
          uploadedBy: citizenSiddharth._id
        }],
        resolution: {
          notes: 'Excavated defective wet mix, compacted with 10-tonne vibratory roller and laid 40mm bituminous concrete.',
          beforeImages: ['/uploads/before-pothole.svg'],
          afterImages: ['/uploads/after-pothole.svg'],
          completionRemarks: 'Surface level aligned with existing carriageway.',
          submittedBy: workerRoa._id,
          submittedAt: hoursAgo(9),
          verifiedBy: officerRoa._id,
          verifiedAt: hoursAgo(8),
          verificationStatus: 'APPROVED'
        },
        citizenFeedback: {
          confirmed: true,
          confirmedAt: hoursAgo(4),
          reopenReason: ''
        }
      },

      // 9. REOPENED - Citizen rejected incomplete work (Escalation Active!)
      {
        caseId: 'CT-2026-000109',
        title: 'Open drainage manhole cover missing on footpath',
        description: 'Heavy concrete chamber cover smashed during pipe laying. Deep 6-foot pit open in the dark.',
        category: 'Drainage & Sewage',
        department: deptDra._id,
        assignedTo: workerDra._id,
        reportedBy: citizenPriya._id,
        priority: 'P2',
        status: 'REOPENED',
        escalationCount: 1,
        acknowledgedAt: hoursAgo(24),
        workStartedAt: hoursAgo(18),
        resolvedAt: hoursAgo(6),
        location: {
          address: 'Near Chamundipuram Circle, Vani Vilas Road',
          ward: 'Ward 3 - Chamundipuram',
          landmark: 'Beside Karnataka Bank ATM',
          coordinates: { lat: 12.2960, lng: 76.6580 }
        },
        sla: {
          startedAt: hoursAgo(2),
          dueAt: hoursAhead(16),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-drain.svg',
          path: '/uploads/before-drain.svg',
          mimeType: 'image/svg+xml',
          size: 16500,
          uploadedBy: citizenPriya._id
        }],
        resolution: {
          notes: 'Placed temporary wooden ply cover over manhole.',
          beforeImages: ['/uploads/before-drain.svg'],
          afterImages: ['/uploads/after-drain.svg'],
          completionRemarks: 'Wood barricade placed.',
          submittedBy: workerDra._id,
          submittedAt: hoursAgo(7),
          verifiedBy: officerUser._id,
          verifiedAt: hoursAgo(6),
          verificationStatus: 'APPROVED'
        },
        citizenFeedback: {
          confirmed: false,
          confirmedAt: hoursAgo(2),
          reopenReason: 'The worker only placed a flimsy piece of plywood! A child or cyclist will fall right through. Proper cast-iron cover required immediately.'
        }
      },

      // 10. SLA BREACHED - Overdue P1 Sanitation Case!
      {
        caseId: 'CT-2026-000110',
        title: 'Severe animal carcass decay obstructing pedestrian pathway',
        description: 'Dead animal carcass emitting overwhelming stench and attracting swarms of flies outside residential apartments. Reported 10 hours ago, no action taken.',
        category: 'Sanitation & Waste',
        department: deptSan._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P1',
        status: 'REPORTED',
        escalationCount: 1,
        location: {
          address: 'Nazarbad Main Road, Near Police Station',
          ward: 'Ward 4 - Nazarbad',
          landmark: 'Opposite Post Office',
          coordinates: { lat: 12.3120, lng: 76.6690 }
        },
        sla: {
          startedAt: hoursAgo(10),
          dueAt: hoursAgo(6), // P1 due 6h ago -> SLA BREACHED
          status: 'BREACHED',
          breachedAt: hoursAgo(6),
          breachReason: 'Resolution SLA exceeded by 6 hours without field worker assignment.'
        },
        attachments: [{
          filename: 'before-dumping.svg',
          path: '/uploads/before-dumping.svg',
          mimeType: 'image/svg+xml',
          size: 15400,
          uploadedBy: citizenSiddharth._id
        }]
      },

      // 11. SLA AT RISK - P2 Roads Case approaching SLA deadline
      {
        caseId: 'CT-2026-000111',
        title: 'Damaged speed breaker without reflective thermoplastic markings',
        description: 'Concrete hump broken into sharp edges causing vehicle underbody scrape and accidents at night.',
        category: 'Roads & Infrastructure',
        department: deptRoa._id,
        assignedTo: workerRoa._id,
        reportedBy: citizenPriya._id,
        priority: 'P2',
        status: 'IN_PROGRESS',
        acknowledgedAt: hoursAgo(21),
        workStartedAt: hoursAgo(5),
        location: {
          address: 'Ramakrishnanagar E & F Block, 4th Cross',
          ward: 'Ward 21 - Ramakrishnanagar',
          landmark: 'Near Shanthi Sagar Hotel',
          coordinates: { lat: 12.2850, lng: 76.6190 }
        },
        sla: {
          startedAt: hoursAgo(21.5),
          dueAt: hoursAhead(2.5), // Only 2.5h left of 24h window -> AT RISK
          status: 'AT_RISK'
        },
        attachments: [{
          filename: 'before-pothole.svg',
          path: '/uploads/before-pothole.svg',
          mimeType: 'image/svg+xml',
          size: 18200,
          uploadedBy: citizenPriya._id
        }]
      },

      // 12. IN_PROGRESS - Kuvempunagar Waste Segregation Site
      {
        caseId: 'CT-2026-000112',
        title: 'Commercial packaging plastic dump in public park boundary',
        description: 'Cartons, thermocol, and single-use plastic dumped overnight along the park walkway.',
        category: 'Sanitation & Waste',
        department: deptSan._id,
        assignedTo: workerSan._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P3',
        status: 'IN_PROGRESS',
        acknowledgedAt: hoursAgo(15),
        workStartedAt: hoursAgo(3),
        location: {
          address: 'M-Block Park, Kuvempunagar',
          ward: 'Ward 19 - Kuvempunagar South',
          landmark: 'Behind Chamarajeshwara Temple',
          coordinates: { lat: 12.2880, lng: 76.6230 }
        },
        sla: {
          startedAt: hoursAgo(18),
          dueAt: hoursAhead(30),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-dumping.svg',
          path: '/uploads/before-dumping.svg',
          mimeType: 'image/svg+xml',
          size: 15400,
          uploadedBy: citizenSiddharth._id
        }]
      },

      // 13. RESOLUTION_SUBMITTED - Pothole fixed, pending Officer approval
      {
        caseId: 'CT-2026-000113',
        title: 'Cluster of 4 potholes near Jayalakshmipuram Post Office',
        description: 'Water-logged potholes slowing traffic and causing severe peak-hour bottlenecks.',
        category: 'Roads & Infrastructure',
        department: deptRoa._id,
        assignedTo: workerRoa._id,
        reportedBy: citizenPriya._id,
        priority: 'P2',
        status: 'VERIFICATION_REQUIRED',
        acknowledgedAt: hoursAgo(18),
        workStartedAt: hoursAgo(6),
        location: {
          address: 'Post Office Road, Jayalakshmipuram',
          ward: 'Ward 9 - Jayalakshmipuram',
          landmark: 'Adjacent to SBI Branch',
          coordinates: { lat: 12.3240, lng: 76.6290 }
        },
        sla: {
          startedAt: hoursAgo(20),
          dueAt: hoursAhead(4),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-pothole.svg',
          path: '/uploads/before-pothole.svg',
          mimeType: 'image/svg+xml',
          size: 18200,
          uploadedBy: citizenPriya._id
        }],
        resolution: {
          notes: 'All 4 potholes squared, tack coated and surfaced with 50mm dense graded bituminous mix.',
          beforeImages: ['/uploads/before-pothole.svg'],
          afterImages: ['/uploads/after-pothole.svg'],
          completionRemarks: 'Traffic opened for normal flow.',
          submittedBy: workerRoa._id,
          submittedAt: hoursAgo(1),
          verificationStatus: 'PENDING'
        }
      },

      // 14. REPORTED - Fresh P3 Streetlight complaint
      {
        caseId: 'CT-2026-000114',
        title: 'Flickering sodium vapor lamp on 1st Cross Saraswathipuram',
        description: 'Lamp turns on and off every 30 seconds creating distracting strobe effect in front of residential bedrooms.',
        category: 'Streetlights & Electrical',
        department: deptEle._id,
        reportedBy: citizenSiddharth._id,
        priority: 'P3',
        status: 'REPORTED',
        location: {
          address: '1st Cross, Saraswathipuram',
          ward: 'Ward 15 - Saraswathipuram',
          landmark: 'Near Swimming Pool',
          coordinates: { lat: 12.3040, lng: 76.6380 }
        },
        sla: {
          startedAt: hoursAgo(5),
          dueAt: hoursAhead(31),
          status: 'ON_TRACK'
        },
        attachments: [{
          filename: 'before-light.svg',
          path: '/uploads/before-light.svg',
          mimeType: 'image/svg+xml',
          size: 14200,
          uploadedBy: citizenSiddharth._id
        }]
      },

      // 15. SLA BREACHED - Drainage Sewer Overflow!
      {
        caseId: 'CT-2026-000115',
        title: 'Sewage overflowing onto roadside from blocked manhole',
        description: 'Raw black water bubbling onto public asphalt, spreading foul odor and contamination. Urgent suction clearance required.',
        category: 'Drainage & Sewage',
        department: deptDra._id,
        assignedTo: workerDra._id,
        reportedBy: citizenPriya._id,
        priority: 'P1',
        status: 'IN_PROGRESS',
        escalationCount: 1,
        acknowledgedAt: hoursAgo(8),
        workStartedAt: hoursAgo(5),
        location: {
          address: 'Dattagalli 3rd Stage, Ring Road Cross',
          ward: 'Ward 21 - Dattagalli',
          landmark: 'Near Royal Inn',
          coordinates: { lat: 12.2810, lng: 76.6110 }
        },
        sla: {
          startedAt: hoursAgo(9),
          dueAt: hoursAgo(5), // P1 due 5h ago -> BREACHED
          status: 'BREACHED',
          breachedAt: hoursAgo(5),
          breachReason: 'Resolution SLA of 4 hours breached. Desilting equipment delayed.'
        },
        attachments: [{
          filename: 'before-drain.svg',
          path: '/uploads/before-drain.svg',
          mimeType: 'image/svg+xml',
          size: 16500,
          uploadedBy: citizenPriya._id
        }]
      }
    ];

    // Add 20 more realistic issues to reach a total of 35 diverse cases
    const mysuruLocations = [
      { address: 'Near Subhash Park, Krishnamurthypuram', ward: 'Ward 16 - Krishnamurthypuram', lat: 12.2990, lng: 76.6450 },
      { address: 'Main Road, Dattagalli Kanakadasa Nagar', ward: 'Ward 22 - Dattagalli South', lat: 12.2770, lng: 76.6050 },
      { address: 'KRS Road, near Railway Workshop', ward: 'Ward 29 - Yadavagiri', lat: 12.3320, lng: 76.6410 },
      { address: 'Sayyaji Rao Road, Bamboo Bazar', ward: 'Ward 25 - Mandi Mohalla', lat: 12.3250, lng: 76.6510 },
      { address: 'Hunsur Road, near DC Office', ward: 'Ward 10 - Chamarajapuram', lat: 12.3150, lng: 76.6430 },
      { address: 'Nanjangud Road, Vidyaranyapuram', ward: 'Ward 17 - Vidyaranyapuram', lat: 12.2850, lng: 76.6520 },
      { address: 'Near Chamundi Foothills, Tavarekatte', ward: 'Ward 2 - Chamundi Vihar', lat: 12.2950, lng: 76.6780 },
      { address: 'Bannur Road, Alanahalli Layout', ward: 'Ward 35 - Alanahalli', lat: 12.3020, lng: 76.6980 },
      { address: 'Maharani College Road, Subbarayanakere', ward: 'Ward 8 - Devaraja Mohalla', lat: 12.3090, lng: 76.6490 },
      { address: 'Ring Road Service Lane, Bogadi 2nd Stage', ward: 'Ward 20 - Bogadi', lat: 12.3020, lng: 76.5980 }
    ];

    const templates = [
      { title: 'Garbage accumulation near roadside storm drain', cat: 'Sanitation & Waste', dept: deptSan._id, prio: 'P2', worker: workerSan._id, att: 'before-dumping.svg' },
      { title: 'Road surface cave-in after underground water pipe repair', cat: 'Roads & Infrastructure', dept: deptRoa._id, prio: 'P1', worker: workerRoa._id, att: 'before-pothole.svg' },
      { title: 'Clogged open stormwater drain overflowing onto market', cat: 'Drainage & Sewage', dept: deptDra._id, prio: 'P2', worker: workerDra._id, att: 'before-drain.svg' },
      { title: 'Streetlight pole tilted at dangerous angle', cat: 'Streetlights & Electrical', dept: deptEle._id, prio: 'P1', worker: workerEle._id, att: 'before-light.svg' },
      { title: 'Illegal plastic burning at vacant plot', cat: 'Sanitation & Waste', dept: deptSan._id, prio: 'P2', worker: workerSan._id, att: 'before-dumping.svg' },
      { title: 'Broken kerbstone causing vehicle tire punctures', cat: 'Roads & Infrastructure', dept: deptRoa._id, prio: 'P3', worker: workerRoa._id, att: 'before-pothole.svg' },
      { title: 'Blocked culvert under railway underpass', cat: 'Drainage & Sewage', dept: deptDra._id, prio: 'P1', worker: workerDra._id, att: 'before-drain.svg' },
      { title: 'Dark stretch of 4 streetlights near women hostel', cat: 'Streetlights & Electrical', dept: deptEle._id, prio: 'P1', worker: workerEle._id, att: 'before-light.svg' },
      { title: 'Uncollected dry waste sacks scattered by wind', cat: 'Sanitation & Waste', dept: deptSan._id, prio: 'P3', worker: workerSan._id, att: 'before-dumping.svg' },
      { title: 'Deep trench dug across road left unpaved for 2 weeks', cat: 'Roads & Infrastructure', dept: deptRoa._id, prio: 'P2', worker: workerRoa._id, att: 'before-pothole.svg' }
    ];

    const statuses = ['REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'VERIFICATION_REQUIRED', 'RESOLVED', 'CLOSED'];

    for (let i = 0; i < 20; i++) {
      const tmpl = templates[i % templates.length];
      const loc = mysuruLocations[i % mysuruLocations.length];
      const caseStatus = statuses[i % statuses.length];
      const caseSeq = 116 + i;
      const isResolved = ['RESOLVED', 'CLOSED'].includes(caseStatus);
      const isBreached = (i % 5 === 0);

      const startedAt = hoursAgo(12 + i * 3);
      const dueAt = isBreached ? hoursAgo(2 + (i % 3)) : hoursAhead(6 + (i * 2));

      const generatedIssue = {
        caseId: `CT-2026-000${caseSeq}`,
        title: `${tmpl.title} - ${loc.ward.split(' - ')[1] || loc.ward}`,
        description: `Citizens in ${loc.address} have filed this issue regarding immediate civic attention. Follow-through required to ensure complete remediation.`,
        category: tmpl.cat,
        department: tmpl.dept,
        reportedBy: (i % 2 === 0) ? citizenPriya._id : citizenSiddharth._id,
        assignedTo: caseStatus !== 'REPORTED' && caseStatus !== 'UNDER_REVIEW' ? tmpl.worker : null,
        priority: tmpl.prio,
        status: caseStatus,
        location: {
          address: loc.address,
          ward: loc.ward,
          landmark: 'Nearby civic junction',
          coordinates: { lat: loc.lat, lng: loc.lng }
        },
        sla: {
          startedAt,
          dueAt,
          status: isResolved ? 'COMPLETED' : (isBreached ? 'BREACHED' : 'ON_TRACK'),
          breachedAt: isBreached ? dueAt : null,
          breachReason: isBreached ? 'Resolution deadline elapsed during high operational backlog.' : null
        },
        attachments: [{
          filename: tmpl.att,
          path: `/uploads/${tmpl.att}`,
          mimeType: 'image/svg+xml',
          size: 15000,
          uploadedBy: citizenPriya._id
        }]
      };

      if (caseStatus === 'ACKNOWLEDGED') {
        generatedIssue.acknowledgedAt = hoursAgo(5);
      } else if (caseStatus === 'IN_PROGRESS') {
        generatedIssue.acknowledgedAt = hoursAgo(8);
        generatedIssue.workStartedAt = hoursAgo(4);
      } else if (caseStatus === 'VERIFICATION_REQUIRED') {
        generatedIssue.acknowledgedAt = hoursAgo(12);
        generatedIssue.workStartedAt = hoursAgo(8);
        generatedIssue.resolution = {
          notes: 'Civic task remediation completed on site. Evidence uploaded for officer verification.',
          beforeImages: [`/uploads/${tmpl.att}`],
          afterImages: [`/uploads/${tmpl.att.replace('before-', 'after-')}`],
          completionRemarks: 'Ready for inspection.',
          submittedBy: tmpl.worker,
          submittedAt: hoursAgo(1.5),
          verificationStatus: 'PENDING'
        };
      } else if (isResolved) {
        generatedIssue.acknowledgedAt = hoursAgo(24);
        generatedIssue.workStartedAt = hoursAgo(18);
        generatedIssue.resolvedAt = hoursAgo(4);
        if (caseStatus === 'CLOSED') generatedIssue.closedAt = hoursAgo(2);
        generatedIssue.resolution = {
          notes: 'Remediation completed and verified as per municipal standards.',
          beforeImages: [`/uploads/${tmpl.att}`],
          afterImages: [`/uploads/${tmpl.att.replace('before-', 'after-')}`],
          completionRemarks: 'Verified on-site by field inspector.',
          submittedBy: tmpl.worker,
          submittedAt: hoursAgo(6),
          verifiedBy: officerUser._id,
          verifiedAt: hoursAgo(4),
          verificationStatus: 'APPROVED'
        };
        generatedIssue.citizenFeedback = {
          confirmed: caseStatus === 'CLOSED',
          confirmedAt: caseStatus === 'CLOSED' ? hoursAgo(2) : null
        };
      }

      issueDefinitions.push(generatedIssue);
    }

    // Insert all issues
    const createdIssues = await Issue.create(issueDefinitions);
    console.log(`[CivicTrack Seed] Successfully created ${createdIssues.length} civic issues.`);

    // 5. Generate Chronological Timeline Updates & Audit Logs for each Issue
    console.log('[CivicTrack Seed] Building chronological timelines, assignments, and audit trails...');

    for (const issue of createdIssues) {
      // Step 1: Issue Reported
      await IssueUpdate.create({
        issue: issue._id,
        message: `Issue reported by ${citizenPriya.name} via citizen portal.`,
        updateType: 'STATUS_CHANGE',
        createdBy: issue.reportedBy,
        previousStatus: null,
        newStatus: 'REPORTED',
        timestamp: issue.sla.startedAt
      });

      await AuditLog.create({
        actor: issue.reportedBy,
        actorName: citizenPriya.name,
        actorRole: 'CITIZEN',
        action: 'ISSUE_CREATED',
        entity: 'Issue',
        entityId: issue._id,
        caseId: issue.caseId,
        metadata: { priority: issue.priority, category: issue.category, ward: issue.location.ward },
        timestamp: issue.sla.startedAt
      });

      // If assigned
      if (issue.assignedTo) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Case reviewed and assigned to field worker ${workerSan.name} by Officer ${officerUser.name}.`,
          updateType: 'ASSIGNMENT',
          createdBy: officerUser._id,
          previousStatus: 'REPORTED',
          newStatus: 'ASSIGNED',
          timestamp: new Date(issue.sla.startedAt.getTime() + 15 * 60 * 1000)
        });

        await Assignment.create({
          issue: issue._id,
          department: issue.department,
          assignedTo: issue.assignedTo,
          assignedBy: officerUser._id,
          priority: issue.priority,
          dueDate: issue.sla.dueAt,
          instructions: 'Please inspect the location immediately and deploy necessary remediation crew.',
          status: ['RESOLVED', 'CLOSED'].includes(issue.status) ? 'COMPLETED' : 'ACKNOWLEDGED',
          acknowledgedAt: issue.acknowledgedAt || new Date(issue.sla.startedAt.getTime() + 30 * 60 * 1000)
        });

        await AuditLog.create({
          actor: officerUser._id,
          actorName: officerUser.name,
          actorRole: officerUser.role,
          action: 'ISSUE_ASSIGNED',
          entity: 'Issue',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { assignedTo: workerSan.name, priority: issue.priority },
          timestamp: new Date(issue.sla.startedAt.getTime() + 15 * 60 * 1000)
        });
      }

      // If acknowledged
      if (issue.acknowledgedAt) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Field worker acknowledged assignment. Tools and transport mobilized.`,
          updateType: 'STATUS_CHANGE',
          createdBy: issue.assignedTo,
          previousStatus: 'ASSIGNED',
          newStatus: 'ACKNOWLEDGED',
          timestamp: issue.acknowledgedAt
        });
      }

      // If work started
      if (issue.workStartedAt) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Remediation crew arrived at location and commenced work.`,
          updateType: 'STATUS_CHANGE',
          createdBy: issue.assignedTo,
          previousStatus: 'ACKNOWLEDGED',
          newStatus: 'IN_PROGRESS',
          timestamp: issue.workStartedAt
        });

        await IssueUpdate.create({
          issue: issue._id,
          message: `Progress Update: Work underway on site. Primary obstruction cleared, finishing final remediation.`,
          updateType: 'PROGRESS',
          createdBy: issue.assignedTo,
          timestamp: new Date(issue.workStartedAt.getTime() + 45 * 60 * 1000)
        });
      }

      // If resolution submitted
      if (issue.resolution && issue.resolution.submittedAt) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Resolution evidence uploaded by worker. Status moved to VERIFICATION_REQUIRED. Note: "${issue.resolution.notes}"`,
          updateType: 'EVIDENCE',
          createdBy: issue.assignedTo,
          previousStatus: 'IN_PROGRESS',
          newStatus: 'VERIFICATION_REQUIRED',
          timestamp: issue.resolution.submittedAt
        });

        await AuditLog.create({
          actor: issue.assignedTo,
          actorName: workerSan.name,
          actorRole: 'FIELD_WORKER',
          action: 'RESOLUTION_SUBMITTED',
          entity: 'Issue',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { notes: issue.resolution.notes },
          timestamp: issue.resolution.submittedAt
        });
      }

      // If verified / resolved
      if (issue.resolvedAt) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Resolution inspected and APPROVED by Officer ${officerUser.name}. Case marked RESOLVED.`,
          updateType: 'VERIFICATION',
          createdBy: officerUser._id,
          previousStatus: 'VERIFICATION_REQUIRED',
          newStatus: 'RESOLVED',
          timestamp: issue.resolvedAt
        });

        await AuditLog.create({
          actor: officerUser._id,
          actorName: officerUser.name,
          actorRole: 'OFFICER',
          action: 'RESOLUTION_APPROVED',
          entity: 'Issue',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { approvedBy: officerUser.name },
          timestamp: issue.resolvedAt
        });
      }

      // If citizen confirmed and closed
      if (issue.closedAt) {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Citizen confirmed satisfactory remediation. Case officially CLOSED.`,
          updateType: 'STATUS_CHANGE',
          createdBy: issue.reportedBy,
          previousStatus: 'RESOLVED',
          newStatus: 'CLOSED',
          timestamp: issue.closedAt
        });

        await AuditLog.create({
          actor: issue.reportedBy,
          actorName: citizenPriya.name,
          actorRole: 'CITIZEN',
          action: 'ISSUE_CLOSED',
          entity: 'Issue',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { closedAt: issue.closedAt },
          timestamp: issue.closedAt
        });
      }

      // If citizen reopened
      if (issue.status === 'REOPENED') {
        await IssueUpdate.create({
          issue: issue._id,
          message: `Citizen flagged unresolved issue and REOPENED case. Reason: "${issue.citizenFeedback?.reopenReason || 'Remediation incomplete.'}"`,
          updateType: 'REOPEN',
          createdBy: issue.reportedBy,
          previousStatus: 'RESOLVED',
          newStatus: 'REOPENED',
          timestamp: issue.citizenFeedback?.confirmedAt || now
        });

        await Escalation.create({
          issue: issue._id,
          reason: `Citizen reopened case: ${issue.citizenFeedback?.reopenReason || 'Work unsatisfactory.'}`,
          severity: 'HIGH',
          escalatedFrom: issue.reportedBy,
          escalatedTo: supvUser._id,
          status: 'ACTIVE',
          createdAt: issue.citizenFeedback?.confirmedAt || now
        });

        await AuditLog.create({
          actor: issue.reportedBy,
          actorName: citizenPriya.name,
          actorRole: 'CITIZEN',
          action: 'ISSUE_REOPENED',
          entity: 'Issue',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { reopenReason: issue.citizenFeedback?.reopenReason },
          timestamp: issue.citizenFeedback?.confirmedAt || now
        });
      }

      // If SLA Breached
      if (issue.sla.status === 'BREACHED') {
        await Escalation.create({
          issue: issue._id,
          reason: `Automatic SLA breach: Due date ${new Date(issue.sla.dueAt).toLocaleTimeString()} exceeded without completed resolution.`,
          severity: issue.priority === 'P1' ? 'CRITICAL' : 'HIGH',
          escalatedFrom: officerUser._id,
          escalatedTo: supvUser._id,
          status: 'ACTIVE',
          createdAt: issue.sla.breachedAt || now
        });

        await IssueUpdate.create({
          issue: issue._id,
          message: `SLA BREACH DETECTED: Automatic escalation dispatched to Department Supervisor ${supvUser.name}.`,
          updateType: 'ESCALATION',
          createdBy: officerUser._id,
          timestamp: issue.sla.breachedAt || now
        });

        await AuditLog.create({
          actor: null,
          actorName: 'System SLA Monitor',
          actorRole: 'SYSTEM',
          action: 'ESCALATION_CREATED',
          entity: 'Escalation',
          entityId: issue._id,
          caseId: issue.caseId,
          metadata: { reason: 'SLA Breach' },
          timestamp: issue.sla.breachedAt || now
        });
      }
    }

    // 6. Generate Notifications
    console.log('[CivicTrack Seed] Creating in-app notifications...');
    await Notification.create([
      {
        recipient: workerSan._id,
        title: 'New Priority Assignment: CT-2026-000105',
        message: 'You have been assigned to roadside waste clearance at Kuvempunagar Double Road. Priority: P1.',
        type: 'ASSIGNMENT',
        link: '/issues/CT-2026-000105',
        isRead: false
      },
      {
        recipient: supvUser._id,
        title: 'CRITICAL SLA BREACH: CT-2026-000110',
        message: 'P1 case CT-2026-000110 (Nazarbad Main Road) has breached resolution deadline. Immediate supervisor intervention required.',
        type: 'SLA_BREACH',
        link: '/issues/CT-2026-000110',
        isRead: false
      },
      {
        recipient: officerUser._id,
        title: 'Verification Required: CT-2026-000106',
        message: 'Worker Manjunath Gowda submitted resolution evidence for choked storm drain in Saraswathipuram.',
        type: 'RESOLUTION',
        link: '/issues/CT-2026-000106',
        isRead: false
      },
      {
        recipient: citizenPriya._id,
        title: 'Work Started on Your Report CT-2026-000105',
        message: 'Sanitation remediation crew has arrived at Kuvempunagar Double Road and commenced work.',
        type: 'STATUS_CHANGE',
        link: '/issues/CT-2026-000105',
        isRead: true
      },
      {
        recipient: supvUser._id,
        title: 'Case Reopened by Citizen: CT-2026-000109',
        message: 'Citizen reported open drainage manhole in Chamundipuram remains unresolved with flimsy wooden cover.',
        type: 'REOPEN',
        link: '/issues/CT-2026-000109',
        isRead: false
      }
    ]);

    console.log('================================================================');
    console.log(' CivicTrack Database Seeding Completed Successfully!');
    console.log(' Demo Accounts Created:');
    console.log(' - Admin:       admin@civictrack.local      / Admin@123');
    console.log(' - Supervisor:  supervisor@civictrack.local / Supervisor@123');
    console.log(' - Officer:     officer@civictrack.local    / Officer@123');
    console.log(' - Worker:      worker@civictrack.local     / Worker@123');
    console.log(' - Citizen:     citizen@civictrack.local    / Citizen@123');
    console.log('================================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[CivicTrack Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
