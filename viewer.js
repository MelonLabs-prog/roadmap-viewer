

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

// Function to generate and display the HTML for the roadmap
function renderRoadmap(roadmapData) {
    if (!roadmapData || !roadmapData.title) {
        console.warn("Attempted to render with invalid roadmap data.");
        return;
    }

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

// Function to fetch the roadmap data from Supabase
const fetchAndRenderRoadmap = async () => {
    const { data: liveData, error } = await supabaseClient
        .from('live_roadmap')
        .select('data') // Select only the 'data' column which contains our JSON
        .eq('id', 1)    // Get the single row with id = 1
        .single();      // We only expect one row.

    if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error for now
        throw error;
    }

    // Render the data if it exists.
    if (liveData && liveData.data) {
        renderRoadmap(liveData.data);
    } else {
        // Display a waiting message if no data is found initially.
        viewerContainer.innerHTML = `
            <div class="loading-state">
                <h2>Loading Roadmap...</h2>
                <p>Waiting for data from the manager.</p>
            </div>
        `;
    }
};

// Function to initialize the viewer and subscribe to real-time updates
async function initializeViewer() {
    try {
        if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
             throw new Error("Supabase URL is not configured in viewer.js. Please paste your Supabase credentials.");
        }

        // 1. Fetch the initial roadmap data on page load.
        await fetchAndRenderRoadmap();

    } catch (error) {
        console.error("Error loading roadmap:", error);
        viewerContainer.innerHTML = `
            <div class="error-state">
                <h2>Could not load roadmap</h2>
                <p>${error.message}</p>
            </div>
        `;
    }

    // 2. Subscribe to broadcast messages for real-time updates.
    const channel = supabaseClient
      .channel('roadmap_updates') // Must match the channel name in the manager app
      .on(
        'broadcast',
        { event: 'update' }, // Listen for the specific 'update' event from the manager app
        (payload) => {
          console.log('Real-time update notification received!', payload);
          // When a notification arrives, fetch the latest data and re-render.
          fetchAndRenderRoadmap();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time broadcast updates!');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime broadcast subscription error:', err);
        }
      });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', initializeViewer);
