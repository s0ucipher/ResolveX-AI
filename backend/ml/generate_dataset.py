"""
Dataset generator for ResolveX AI.
Generates a representative, synthetic college campus complaints dataset across 10 categories.
Includes varied phrasing, lengths, realistic campus locations, and severity levels.
"""

import csv
import os
import random

random.seed(42)

CATEGORIES = [
    "Electrical and lighting",
    "Water supply",
    "Plumbing and sanitation",
    "Roads and infrastructure",
    "Classroom and laboratory facilities",
    "Internet and IT services",
    "Hostel and accommodation",
    "Cleanliness and waste management",
    "Safety and security",
    "Other"
]

LOCATIONS = [
    "Main Academic Block - 2nd Floor",
    "Science Block B - Lab 104",
    "Boys Hostel 1 - Wing A",
    "Boys Hostel 2 - 3rd Floor",
    "Girls Hostel 1 - Ground Floor",
    "Girls Hostel 2 - Block C",
    "Central Library - Reading Hall",
    "Computer Science Building - Lab 3",
    "Mechanical Workshop - Section B",
    "Campus Cafeteria & Food Court",
    "Main Gate and Security Post",
    "Sports Complex and Gymnasium",
    "Auditorium & Seminar Hall",
    "Admin Block - Registrar Office corridor",
    "Campus North Pathway",
    "Parking Lot Zone C"
]

TEMPLATES = {
    "Electrical and lighting": [
        ("Exposed electrical wiring sparking", "Exposed live wires hanging from the ceiling near the staircase, sparking intermittently when the AC turns on. Severe electrocution danger."),
        ("Tube lights flickering constantly", "Multiple tube lights in room 204 have been flickering violently for three days causing eye strain during lectures."),
        ("Power socket burnt out", "The wall power socket next to workbench 4 has burnt marks and smelled like melted plastic. Power cuts off when plugged in."),
        ("Dark corridor with non-working lights", "All hallway lights on the 2nd floor east wing are fused. It is completely dark at night and difficult to walk."),
        ("Frequent circuit breaker tripping", "The main switchboard breaker trips every time computers in the lab are booted up, halting lab practicals."),
        ("Ceiling fan making screeching noise and wobbling", "The ceiling fan in lecture hall 3 wobbles violently at speed 3 and feels like it might drop down."),
        ("Street lights around hostel pathway dead", "The entire walkway from library to boys hostel has no functional streetlights. Dangerous at night."),
        ("Exhaust fan not functioning in chemistry lab", "The chemical exhaust fan in organic lab stopped working, causing fume buildup in the room."),
        ("Voltage fluctuation damaging equipment", "Severe voltage drops happening across the block. One monitor has already burned out."),
        ("Switchboard cover broken leaving live terminals", "Switchboard switch is cracked open and naked metal pins are exposed to touch near the water cooler.")
    ],
    "Water supply": [
        ("No running water in hostel floor", "There has been zero tap water supply on the 3rd floor of hostel 2 since yesterday morning. Students cannot shower."),
        ("Water cooler dispensing murky brownish water", "The drinking water cooler in academic block A has rusty brown water coming out with unpleasant odor."),
        ("Overhead tank overflowing continuously", "The hostel roof water tank is overflowing and cascading down the side walls, wasting thousands of liters of clean water."),
        ("Low water pressure in restrooms", "Water pressure in all the 1st floor taps is almost zero; barely a trickle comes out."),
        ("Drinking water filter beeping and red indicator on", "The UV water purifier in the library shows filter expiration error and dispensing has stopped."),
        ("No hot water supply in winter", "The solar geyser system in the wing is not functioning, completely cold water in early mornings."),
        ("Water pump motor tripping repeatedly", "The borewell water pump shuts down within 2 minutes of turning on, leaving overhead reservoirs empty."),
        ("Water foul smelling from main supply line", "The tap water has a distinct sewage or sulfur odor, possibly a cross contamination issue."),
        ("Dry taps in campus cafeteria kitchen", "Kitchen staff report that supply water has been cut since 8 AM, affecting lunch preparation."),
        ("Delayed morning water release schedule", "Water supply is only turned on at 9:30 AM after classes have already begun.")
    ],
    "Plumbing and sanitation": [
        ("Severe washroom pipe leakage flooding floor", "A pipe under the washroom sink burst open and water is leaking heavily into the main hallway."),
        ("Clogged toilet commode overflowing", "Two commodes in the second floor gents washroom are heavily choked and overflowing with wastewater."),
        ("Drain blockage causing foul sewer smell", "Floor drain in the hostel shower room is choked with debris, stagnant dirty water accumulating."),
        ("Leaking flush cistern running non-stop", "Flush tank in restroom stall 3 does not stop leaking water, creating constant noise and puddle."),
        ("Broken washbasin tap spraying water", "The tap handle broke off and high pressure water is spraying across the restroom walls."),
        ("Sewage backup in ground floor drains", "Dark backflow coming out of floor grates in ground floor corridor, highly unhygienic biohazard."),
        ("Broken toilet seat and missing latches", "Toilet seats are cracked and door locks are completely broken in ladies washroom."),
        ("Water seeping through ceiling from upstairs toilet", "The ceiling in lab 102 shows damp brown seepage directly beneath the 2nd floor restrooms."),
        ("Urinal sensors broken and urinals not flushing", "Sensor urinals in main auditorium restroom do not flush, leading to pungent ammonia buildup."),
        ("Rusted corroded drainage pipes under sink", "Under-sink drainage pipes have rusted through with dirty soapy water dripping on the cabinet.")
    ],
    "Roads and infrastructure": [
        ("Deep pothole causing bike skidding", "A deep pothole has formed near the campus main gate bend, two students have already slipped on their two-wheelers."),
        ("Broken concrete walkway pavers", "Several paver blocks have sunken or loosened along the main academic quad, tripping hazard for pedestrians."),
        ("Cracked wall and crumbling plaster", "The exterior wall near staircase 4 has large vertical cracks with plaster chunks falling down."),
        ("Speed breaker missing warning paint", "The new speed breaker near sports ground has no yellow reflective paint, nearly causing bike crashes."),
        ("Damaged railing on staircase", "Handrail on the 3rd floor fire escape stairs is loose and wobbles under slight pressure."),
        ("Waterlogging on access road after rain", "The road connecting hostel block to mess gets submerged under 6 inches of muddy water after every shower."),
        ("Broken storm drain concrete slab", "A heavy drainage cover slab near the bus bay has cracked open, leaving a foot-wide hole in the pavement."),
        ("Sunken asphalt in parking area", "A 2-meter section of asphalt has depressed near the visitor parking, collecting mud and debris."),
        ("Rusted metal grill about to detach", "Window safety grill on 4th floor balcony has corroded bolts and is hanging loosely."),
        ("Staircase steps chipped with exposed rebar", "Concrete edge of steps 5 and 6 has chipped away completely, exposing sharp rusted reinforcement iron.")
    ],
    "Classroom and laboratory facilities": [
        ("Projector bulb dead in lecture hall", "Ceiling projector in LH-101 will not turn on and bulb warning light is blinking red. Presentations cannot be shown."),
        ("Broken classroom desks and chairs", "Four wooden benches in room 305 have loose nails protruding and broken backrests, tearing clothes."),
        ("Air conditioner not cooling and blowing warm air", "The split AC units in the seminar hall run loudly but only blow warm ambient air."),
        ("Microscope stage clips broken in bio lab", "Three binocular microscopes have broken focus gears and missing stage clips for specimen slides."),
        ("Whiteboard damaged and stained permanently", "The main whiteboard in tutorial room 2 has deep scratches and ink will not erase cleanly."),
        ("Chemical fume hood sash stuck open", "The glass safety sash on fume hood 2 is jammed halfway, unsafe for volatile solvent experiments."),
        ("Audio microphone feedback in auditorium", "Podium wireless mic is emitting deafening screech and cutting out during guest seminars."),
        ("Oscilloscope probes missing in electronics lab", "Several digital storage oscilloscopes in instrumentation lab are missing BNC probe cables."),
        ("Lecture hall window blinds torn down", "Sunlight shines directly on presentation screen because three window roll blinds are snapped."),
        ("Digital podium touch screen unresponsive", "The smart instructor podium touchscreen does not register stylus or finger touch.")
    ],
    "Internet and IT services": [
        ("Campus Wi-Fi authentication portal down", "The captive portal login page for Student-WiFi returns error 502 Bad Gateway; cannot connect."),
        ("Extremely slow internet speeds under 1 Mbps", "Hostel Wi-Fi bandwidth has dropped severely, ping exceeds 600ms, online course portals unusable."),
        ("Ethernet LAN port not working on lab desks", "Wall LAN ports 12 through 16 in computer lab 2 have no link lights and no IP assigned via DHCP."),
        ("College ERP portal throwing database error", "Students attempting to register for semester exams get internal server error on the ERP portal."),
        ("Library computer terminal infected with malware", "Two public OPAC catalog terminals in library show ransomware/adware popups on startup."),
        ("Wi-Fi router in wing B dead no signal", "The ceiling access point in 2nd floor corridor shows no power LED, Wi-Fi SSID disappeared."),
        ("DNS resolution failures on college network", "Domain names fail to resolve on campus network unless Google 8.8.8.8 is manually entered."),
        ("Printer offline in computer center", "Network laser printer in central computing facility shows paper jam error even after tray check."),
        ("Student email account login locked", "Several 3rd year students locked out of institutional Google workspace accounts without reset link."),
        ("VPN connection drops frequently", "Remote research lab VPN disconnects every 5 minutes when accessing IEEE research databases.")
    ],
    "Hostel and accommodation": [
        ("Bed bug infestation in hostel room", "Persistent bed bug outbreak in room 214 of Block A. Mattresses and bed frames require urgent pest control."),
        ("Room door lock broken and won't latch", "The cylindrical door lock on room 108 is jammed from inside and key turns freely without unlocking."),
        ("Hostel mess food quality degraded and cold", "The dinner served yesterday was undercooked and cold, multiple students complained of stomach ache."),
        ("Window glass pane shattered by wind", "A strong breeze cracked the hostel bedroom window pane and sharp glass shards fell on study table."),
        ("Hostel common room TV cable disconnected", "Cable dish receiver in recreation room has no subscription signal for two weeks."),
        ("Washing machine in hostel laundry broken", "Washing machine unit 2 in basement laundry makes loud banging noise and does not spin dry."),
        ("Stray dogs entering hostel ground floor", "Ground floor entry doors have no spring closers, stray dogs wander into corridors at night."),
        ("Cupboard hinges broken in hostel room", "The steel almirah door has detached from its hinge and leans precariously forward."),
        ("Hostel water cooler cooling compressor dead", "Water cooler in block C dispenses room temperature water in peak summer."),
        ("Excessive noise in hostel corridors during quiet hours", "Hostel wing loudspeaker playing loud music past midnight without warden intervention.")
    ],
    "Cleanliness and waste management": [
        ("Overflowing dustbins outside cafeteria", "The two large green municipal bins outside cafeteria have been overflowing for 3 days with food waste spilling."),
        ("Discarded plastic bottles and litter around garden", "The open lawn behind science block is littered with snack wrappers, empty drink bottles and disposable cups."),
        ("Dead rodent in ground floor corridor", "A dead rat was spotted near the emergency exit door on ground floor, creating foul odor and hygiene hazard."),
        ("Messy leftover food trays left in study area", "Students leaving half-eaten food plates and cups on library discussion room tables."),
        ("Sanitary napkin disposal bins overflowing", "The pedal bins in 1st floor ladies restrooms are completely filled and not cleared by cleaning staff."),
        ("Fallen tree leaves blocking rainwater drain", "A thick pile of rotting dry leaves has choked the stormwater grate, causing water to pool."),
        ("Staircase covered in construction dust and rubble", "Masonry debris from the renovation work left unattended on the main staircase for days."),
        ("Dirty stained corridors requiring wet mopping", "Ground floor passage has dried muddy shoe prints and spilled coffee stains unwashed since Monday."),
        ("Biohazard chemical waste left unlabelled", "Bottles containing chemical waste left sitting on lab floor without proper biohazard disposal bags."),
        ("Trash burning on campus perimeter", "Gardening staff burning piles of leaves and plastic trash near sports fence, causing heavy smoke.")
    ],
    "Safety and security": [
        ("Fire extinguisher inspection tag expired", "The dry powder fire extinguishers on 3rd floor expired in 2022 and pressure gauge is in the red zone."),
        ("Emergency exit door padlocked shut", "The emergency fire exit door at the end of the east corridor has been chained and padlocked, trapping occupants."),
        ("Suspicious trespassers roaming near girls hostel", "Unidentified persons without campus visitor badges seen loitering around the girls hostel boundary wall after dark."),
        ("CCTV surveillance camera blind spot / dead unit", "Security camera pointed at bicycle parking shed has power LED off and lens covered in grime."),
        ("Theft of personal laptop from library desk", "A student laptop was stolen from 1st floor reading table while user stepped away for 10 minutes."),
        ("Broken glass shards scattered on walkway", "Broken beer or soda bottles scattered across the walkway between auditorium and workshop."),
        ("Security guard absent from gate 2 checkpoint", "Campus side gate 2 was completely unattended between 8 PM and 11 PM, vehicles entering unchecked."),
        ("Slippery floor with no warning signage", "Mopped marble floor near cafeteria entrance has no caution cone, two visitors almost slipped."),
        ("Fume detector alarm constantly beeping false alarms", "Optical smoke detector in server room beeps loudly every 10 seconds despite no smoke."),
        ("Gate card reader not locking magnetic door", "The RFID access control door to the research facility fails to latch, allowing free unauthorized entry.")
    ],
    "Other": [
        ("Campus bus schedule delayed without notice", "Morning college transport route 4 bus arrived 45 minutes late without any prior student notification."),
        ("Library book return fine erroneously charged", "The automated RFID return box failed to register my returned book and account shows overdue fine."),
        ("Campus courier package delivery delayed", "Package marked delivered by courier at campus dispatch counter cannot be located by staff."),
        ("Noise disturbance from construction drill during exams", "Heavy jackhammer drilling on roof above exam hall 201 during ongoing midterm examination."),
        ("Hostel curfew timing confusion on weekends", "Notice board rules contradict the digital app policy regarding Saturday night campus entry times."),
        ("Gym equipment weight plates missing and disorganized", "Several 10kg and 5kg dumbbell pairs missing from campus gym, benches broken."),
        ("Student identity card barcode not scanning at turnstile", "New semester ID card barcode is unreadable by the library turnstiles, requiring manual entry."),
        ("Cafeteria vendor overcharging above MRP", "The packaged beverage counter in food court charges 5 rupees above the printed maximum retail price."),
        ("Lost keys found handed to admin but not posted", "Found a set of motorcycle keys on football ground, need lost and found broadcast message."),
        ("Parking permits allocation delay for day scholars", "Day scholar two-wheeler parking pass applications pending approval for over three weeks.")
    ]
}

# Variations and perturbations to expand the dataset to ~500+ rich rows
PREFIXES = [
    "",
    "Urgent: ",
    "Attention: ",
    "Repeated issue: ",
    "Please resolve ASAP - ",
    "Complaint regarding ",
    "Issue with ",
    "Critical problem: "
]

SUFFIXES = [
    " Needs prompt resolution by the campus facility team.",
    " Kindly dispatch a technician as soon as possible.",
    " This has been happening for the last few days.",
    " Students are facing immense inconvenience.",
    " Poses a direct safety concern to campus residents.",
    " Reported multiple times previously with no action taken.",
    " Please look into this at the earliest.",
    ""
]

def generate_dataset(output_path: str, target_count_per_category: int = 50):
    rows = []
    
    for category, items in TEMPLATES.items():
        cat_count = 0
        # First add original 10 templates
        for title, desc in items:
            loc = random.choice(LOCATIONS)
            rows.append({
                "title": title,
                "description": desc,
                "category": category,
                "location": loc
            })
            cat_count += 1
            
        # Generate variations to reach target_count_per_category
        while cat_count < target_count_per_category:
            base_title, base_desc = random.choice(items)
            prefix = random.choice(PREFIXES)
            suffix = random.choice(SUFFIXES)
            loc = random.choice(LOCATIONS)
            
            # Synthesize title and description variations
            title_var = f"{prefix}{base_title}".strip()
            desc_var = f"{base_desc}{suffix}".strip()
            
            rows.append({
                "title": title_var,
                "description": desc_var,
                "category": category,
                "location": loc
            })
            cat_count += 1
            
    # Shuffle dataset
    random.shuffle(rows)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["title", "description", "category", "location"])
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"Generated {len(rows)} complaints across {len(CATEGORIES)} categories in {output_path}")

if __name__ == "__main__":
    generate_dataset("data/synthetic_complaints.csv", target_count_per_category=50)

