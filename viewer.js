// --- Step 1: PASTE YOUR SUPABASE CREDENTIALS HERE ---
const SUPABASE_URL = 'https://llokephtjuunizcrlrza.supabase.co'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_kXHwfHjUwXqKSP1SecLzjg__3aKxP6G'; // Replace with your anon (public) key

// --- Helper Functions ---
const calculateDaysBetween = (start, end) => {
    const diff = +new Date(`${end}T00:00:00`) - +new Date(`${start}T00:00:00`);
    if (diff < 0) return 0;
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
};

const calculateTimeLeft = (deadline) => {
    const difference = +new Date(deadline) - +new Date();
    if (difference > 0) {
        return { days: Math.ceil(difference / (1000 * 60 * 60 * 24)) };
    }
    return null;
};

// --- Main App Logic ---
const viewerContainer = document.getElementById('roadmap-viewer');

// Initialize the Supabase client
// The global 'supabase' object is available because of the script tag in index.html
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to fetch and render the latest roadmap
async function loadAndRenderRoadmap() {
    try {
        if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
             throw new Error("Supabase URL is not configured in viewer.js. Please paste your Supabase credentials.");
        }

        // Fetch the most recent roadmap entry.
        // We remove .single() to gracefully handle cases where the table is empty.
        const { data: roadmapArray, error } = await supabaseClient
            .from('roadmaps')
            .select('data') // Select only the 'data' column which contains our JSON
            .order('created_at', { ascending: false }) // Order by creation date to get the latest
            .limit(1); // We only want one, which will be the first item in an array.

        if (error) throw error;

        // Check if we received any data.
        if (roadmapArray && roadmapArray.length > 0 && roadmapArray[0].data) {
            // If we have at least one record, render the data from the first one.
            renderRoadmap(roadmapArray[0].data);
        } else {
            // If the table is empty or the latest record has no data, show a helpful message.
            throw new Error("No roadmap data found in the database. Have you successfully synced from the main app yet?");
        }

    } catch (error) {
        console.error("Error loading roadmap:", error);
        viewerContainer.innerHTML = `
            <div class="error-state">
                <h2>Could not load roadmap</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Function to generate and display the HTML for the roadmap
function renderRoadmap(roadmapData) {
    const { title, deadline, phases, categories } = roadmapData;
    let taskIndex = 0;

    const timeLeft = calculateTimeLeft(deadline);
    const deadlineHTML = timeLeft
        ? `<span>${timeLeft.days}</span> ${timeLeft.days === 1 ? 'day' : 'days'} until deadline`
        : `<span>Deadline has passed!</span>`;

    let phasesHTML = '';
    for (const phase of phases) {
        phasesHTML += `
            <li class="phase-milestone">
                <div class="phase-header-content">
                    <span class="phase-name">${phase.name}</span>
                </div>
            </li>
        `;
        for (const task of phase.tasks) {
            const sideClass = taskIndex++ % 2 === 0 ? 'right' : 'left';
            const duration = calculateDaysBetween(task.startDate, task.endDate);
            phasesHTML += `
                <li class="task-card ${sideClass}" style="--category-color: ${categories[task.category] || '#ccc'}">
                    <div class="task-content">
                        <h4 class="task-name">${task.name}</h4>
                        <p class="task-description">${task.description}</p>
                        <div class="task-footer">
                            <span class="task-dates">${task.startDate} → ${task.endDate}</span>
                            <span class="task-duration">${duration} ${duration === 1 ? 'day' : 'days'}</span>
                        </div>
                    </div>
                </li>
            `;
        }
    }

    const roadmapHTML = `
        <header class="header">
            <h1 class="title">${title}</h1>
            <div class="countdown">${deadlineHTML}</div>
        </header>
        <main>
            <ul class="tasks-list">
                ${phasesHTML}
            </ul>
        </main>
    `;
    
    viewerContainer.innerHTML = roadmapHTML;
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadAndRenderRoadmap);
