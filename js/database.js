require('dotenv').config(); // Naloži spremenljivke iz .env datoteke
const { createClient } = require('@supabase/supabase-js');

// Prebere podatke iz .env datoteke
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Prijava ali avtomatska registracija uporabnika v bazo
async function loginUser(username, callback) {
    try {
        let { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (!data) {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ username }])
                .select()
                .single();

            if (insertError) throw insertError;
            currentUser = newUser.username;
        } else {
            currentUser = data.username;
        }

        if (callback) callback(currentUser);
        return true;
    } catch (err) {
        console.error('Napaka pri prijavi:', err.message);
        alert('Napaka pri prijavi: ' + err.message);
        return false;
    }
}

// Zapis testa v centralno bazo
async function recordTestResult(projectName, status) {
    try {
        const { error } = await supabase
            .from('test_history')
            .insert([{
                project_name: projectName,
                username: currentUser || 'Gost',
                status: status
            }]);

        if (error) throw error;
    } catch (err) {
        console.error('Napaka pri shranjevanju zgodovine:', err.message);
    }
}

// Pridobitev celotne globalne zgodovine iz baze
async function fetchGlobalHistory() {
    try {
        const { data, error } = await supabase
            .from('test_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Napaka pri pridobivanju zgodovine:', err.message);
        return [];
    }
}

function getCurrentUser() {
    return currentUser || 'Gost (Neznano)';
}

module.exports = { loginUser, recordTestResult, fetchGlobalHistory, getCurrentUser };