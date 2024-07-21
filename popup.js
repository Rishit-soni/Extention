document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('api-data').innerHTML = 'Loading.....';
    try {
        const content = await fetchDataAndDisplay();
        document.getElementById('api-data').innerHTML = content;
    } catch (error) {
        document.getElementById('api-data').innerHTML = 'Error fetching data: ' + error.message;
        console.error(error)
    }
});

async function fetchDataAndDisplay() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: fetchAndProcessData,
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (results && results[0] && results[0].result) {
                    resolve(results[0].result);
                } else {
                    reject(new Error('Failed to fetch data'));
                }
            });
        });
    });
}

function fetchAndProcessData() {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            return resolve('Token not found in local storage');
        }
        

        fetch('https://kevit.keka.com/k/attendance/api/mytime/attendance/summary', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(response => {
            response = response.data;
            if (response && response.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const todayDataObject = response.find(item => item.attendanceDate.split('T')[0] === today);
                console.table(todayDataObject);
                if (todayDataObject?.arrivalMessage === "No entries logged") {
                    return resolve("No entries logged");
                } else {
                    const totalEffectiveHours = todayDataObject.totalEffectiveHours;
                    const timeEntries = todayDataObject.timeEntries;
                    const lastTimeEntry = timeEntries[timeEntries?.length - 1].actualTimestamp;
    
                    const lastEntryTime = new Date(lastTimeEntry);
                    const targetEffectiveHours = todayDataObject.shiftEffectiveDuration;
    
                    if (timeEntries?.length % 2 !== 0) {
                        const remainingHours = targetEffectiveHours - totalEffectiveHours;
                        const remainingTimeInMs = remainingHours * 60 * 60 * 1000;
                        const leaveTime = new Date(lastEntryTime.getTime() + remainingTimeInMs);
    
                        const hours = Math.floor(totalEffectiveHours);
                        const minutes = Math.floor((totalEffectiveHours - hours) * 60);
                        const formattedEffectiveHours = `${hours}h ${minutes}m`;
    
                        const targetHours = Math.floor(targetEffectiveHours);
                        const targetMinutes = Math.floor((targetEffectiveHours - targetHours) * 60);
                        const formattedTargetEffectiveHours = `${targetHours}h ${targetMinutes}m`;
    
                        const content = `You should leave the office at: <strong>${leaveTime.toLocaleTimeString()}</strong>`;
                        return resolve(content);
                    } else {
                        if (totalEffectiveHours >= targetEffectiveHours) {
                            return resolve("You have <strong>completed</strong> today's effective hours.");
                        } else {
                            return resolve(`You <strong>not completed</strong> today's effective hours.</strong>`);
                        }
                    }
                }
            } else {
                return resolve("No data available");
            }
        })
        .catch(error => resolve('Error: ' + error.message)
    );
    });
}
