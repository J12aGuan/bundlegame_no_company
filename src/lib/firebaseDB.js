import { timeStamp } from './bundle';
import {app, firestore} from './firebaseConfig';
import { collection, collectionGroup, doc, setDoc, getDoc, getDocs, addDoc, arrayUnion, updateDoc, Timestamp, increment, deleteDoc } from "firebase/firestore";

export const incrementCounter = async () => {
    const docRef = doc(collection(firestore, 'Global'), "totalusers");
    try {
        await updateDoc(docRef, {
            count: increment(1)
        });
        console.log("Count incremented");
    } catch (error) {
        console.error("Error adding document: ", error);
    }
}

export const getCounter = async () => {
    const docRef = doc(collection(firestore, 'Global'), "totalusers");
    try {
        const docSnap = await getDoc(docRef);
        let count = docSnap.data().count
        console.log("Count retrieved");
        return count
    } catch (error) {
        console.error("Error adding document: ", error);
    }
    return 0
}

export const createUser = async (id, n) => {
    const data = {
        earnings: 0,
        ordersComplete: 0,
        uniqueSetsComplete: 0,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        configuration: n
    }
    const userDocRef = doc(collection(firestore, 'Users'), id);

    try {
        await setDoc(userDocRef, data);
        console.log("Document written with ID: ", id);
    } catch (error) {
        console.error("Error adding document: ", error);
    }
    const actionDocRef = doc(collection(firestore, 'Users/' + id + '/Actions'), 'start')
    const actionData = {
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        earnings: 0,
        ordersComplete: 0,
        uniqueSetsComplete: 0,
        gametime: 0
    }

    try {
        await setDoc(actionDocRef, actionData)
        console.log("Start action written with id ", id);
    } catch (error) {
        console.error("Error creating actions collection: ", error);
    }
    
    return id
}

//function for a random number given a seed
//written by CHATGPT
function hashSeed(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
    }
    return hash;
}
//written by CHAT GPT
function seededRandom(seed) {
    let x = seed % 2147483647;
    if (x <= 0) x += 2147483646;
    return function() {
        x = x * 16807 % 2147483647;
        return (x - 1) / 2147483646;
    };
}

function digitToHex(digit) {
    switch (digit) {
        case 10:
            return "A"
        case 11:
            return "B"
        case 12:
            return "C"
        case 13:
            return "D"
        case 14:
            return "E"
        case 15:
            return "F"
        default:
            return digit
    }
}

function generateNumber(random, modulo) {
    // Generate the first 3 digits randomly
    const first3Digits = [];
    for (let i = 0; i < 3; i++) {
        first3Digits.push(Math.floor(random() * 16)); // Random digit between 0-15
    }

    // Compute the checksum (4th digit)
    let total = 0;
    for (let i = 0; i < first3Digits.length; i++) {
        let digit = first3Digits[i];
        if (i == 1) {
            digit *= 2;
            if (digit > 15) {
                digit -= 15;
            }
        }
        total += digit;
        first3Digits[i] = digitToHex(digit)
    }

    // Calculate the checksum digit to make total % 16 === modulo
    const checksumDigit = digitToHex(((16 - (total % 16)) + modulo) % 16);
    
    first3Digits.push(checksumDigit);

    // Return the 4-digit number as a string
    return first3Digits.join('');
}

function generateToken(id) {
    const seed = hashSeed(id)
    const random = seededRandom(seed);
    let first = generateNumber(random, 11) //B
    let second = generateNumber(random, 0) //0
    let third = generateNumber(random, 11) //B
    let fourth = generateNumber(random, 10) //A
    return first + "-" + second + "-" + third + "-" + fourth
}

export const generateCompleteId = (id) => {
    let newId = id + "qq"
    let generatedToken = generateToken(newId)
    return generatedToken
}

//returns 0 on error and 1 on success
export const authenticateUser = async (id, token) => {
    const userDocRef = doc(collection(firestore, 'Auth'), id);
    const userDocSnap = await getDoc(userDocRef)
    if (userDocSnap.exists()) {
        if (userDocSnap.data().status == 2) {
            return 1
        }
        return 0
    }
    //token does not exist, generate a token for the user and see if matches
    let generatedToken = generateToken(id)
    if (generatedToken == token) {
        const data = {
            userid: id,
            status: 1
        }
        const userDocRef = doc(collection(firestore, 'Auth'), token);
        try {
            await setDoc(userDocRef, data);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
        return 1
    } else {
        return 0
    }
}

export const addAction = async (id, gamestate, name) => {
    const actionDocRef = doc(collection(firestore, 'Users/' + id + '/Actions'), name)
    gamestate.createdAt = Timestamp.fromDate(new Date())
    gamestate.updatedAt = Timestamp.fromDate(new Date())
    gamestate.userID = id
    try {
        await setDoc(actionDocRef, gamestate)
        console.log("Start action written with id ", id);
    } catch (error) {
        console.error("Error creating actions collection: ", error);
    }
    return id
}

export const addOrder = async (id, gamestate, orderID) => {
    const orderDocRef = doc(collection(firestore, 'Users/' + id + '/Orders'), orderID)
    gamestate.createdAt = Timestamp.fromDate(new Date())
    gamestate.updatedAt = Timestamp.fromDate(new Date())
    gamestate.userID = id
    try {
        await setDoc(orderDocRef, gamestate)
        console.log("Added an order with ", id);
    } catch (error) {
        console.error("Error adding order: ", error);
    }
    return id
}

export const updateOrder = async (id, gamestate, orderID) => {
    const orderDocRef = doc(collection(firestore, 'Users/' + id + '/Orders'), orderID)
    gamestate.updatedAt = Timestamp.fromDate(new Date())
    try {
        await updateDoc(orderDocRef, gamestate)
        console.log("Document updated with id: ", id)
    } catch (error) {
        console.error("Error updating document: ", error);
    }
    return id
}

export const updateFields = async (id, gamestate) => {
    const userDocRef = doc(collection(firestore, 'Users'), id)
    gamestate.updatedAt = Timestamp.fromDate(new Date())
    try {
        await updateDoc(userDocRef, gamestate)
        console.log("Document updated with id: , id")
    } catch (error) {
        console.error("Error updating document: ", error);
    }
    return id
}

async function getSubcollections(id, field) {
    const subcollectionRefs = await getDocs(collection(firestore, 'Users/' + id + field)); // Adjust this line for specific subcollections
    const subcollectionData = subcollectionRefs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return subcollectionData;
  }

export const retrieveData = async () => {
    const querySnapshot = await getDocs(collection(firestore, 'Users'));
    const data = [];
    console.log(querySnapshot)

    for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        const docId = docSnapshot.id;
        console.log(docId)
        if (true) {
            
            // Fetch subcollections for each document
            const orders = await getSubcollections(docId, '/Orders');
            const actions = await getSubcollections(docId, '/Actions');
            
            
            data.push({
            id: docId,  // Include document ID
            ...docData,
            orders,
            actions  // Attach subcollections
            });
        } else {
            console.log("not adding to data")
        }
        
    }

    return data;
}

// ===== CONFIG MANAGEMENT (EXPERIMENTS) =====

export const getAllConfigs = async () => {
    try {
        const querySnapshot = await getDocs(collection(firestore, 'Configs'));
        console.log('Fetched all configs');
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching configs:', error);
        return [];
    }
}

export const getConfigByName = async (configName) => {
    try {
        const docSnap = await getDoc(doc(firestore, 'Configs', configName));
        if (docSnap.exists()) {
            console.log('Config found:', configName);
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log('Config not found:', configName);
            return null;
        }
    } catch (error) {
        console.error('Error fetching config:', error);
        return null;
    }
}

export const saveConfig = async (configId, configData) => {
    try {
        const docRef = doc(firestore, 'Configs', configId);
        await setDoc(docRef, {
            ...configData,
            updatedAt: Timestamp.fromDate(new Date()),
            createdAt: configData.createdAt || Timestamp.fromDate(new Date())
        });
        console.log('Config saved:', configId);
        return configId;
    } catch (error) {
        console.error('Error saving config:', error);
        throw error;
    }
}

export const deleteConfig = async (configId) => {
    try {
        await deleteDoc(doc(firestore, 'Configs', configId));
        console.log('Config deleted:', configId);
    } catch (error) {
        console.error('Error deleting config:', error);
        throw error;
    }
}

// ============ MasterData Management ============

// Central Game Configuration
export const getCentralConfig = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'centralConfig'));
        if (docSnap.exists()) {
            console.log('Central config fetched');
            return docSnap.data();
        } else {
            console.log('Central config not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching central config:', error);
        return null;
    }
}

export const saveCentralConfig = async (configData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'centralConfig');
        await setDoc(docRef, {
            ...configData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Central config saved');
        return true;
    } catch (error) {
        console.error('Error saving central config:', error);
        throw error;
    }
}

// Experiment Scenarios
export const getExperimentScenarios = async (scenariosId = 'experimentScenarios') => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', scenariosId));
        if (docSnap.exists()) {
            console.log(`Experiment scenarios fetched: ${scenariosId}`);
            return docSnap.data().scenarios || [];
        } else {
            console.log(`Experiment scenarios not found: ${scenariosId}`);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching experiment scenarios (${scenariosId}):`, error);
        return [];
    }
}

export const saveExperimentScenarios = async (scenariosData, scenariosId = 'experimentScenarios') => {
    try {
        const docRef = doc(firestore, 'MasterData', scenariosId);
        await setDoc(docRef, {
            scenarios: scenariosData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log(`Experiment scenarios saved: ${scenariosId}`);
        return true;
    } catch (error) {
        console.error(`Error saving experiment scenarios (${scenariosId}):`, error);
        throw error;
    }
}

// Tutorial Configuration
export const getTutorialConfig = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'tutorialConfig'));
        if (docSnap.exists()) {
            console.log('Tutorial config fetched');
            return docSnap.data();
        } else {
            console.log('Tutorial config not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching tutorial config:', error);
        return null;
    }
}

export const saveTutorialConfig = async (configData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'tutorialConfig');
        await setDoc(docRef, {
            ...configData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Tutorial config saved');
        return true;
    } catch (error) {
        console.error('Error saving tutorial config:', error);
        throw error;
    }
}

// Orders Data
export const getOrdersData = async (ordersId = 'order') => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', `orders_${ordersId}`));
        if (docSnap.exists()) {
            console.log(`Orders ${ordersId} fetched`);
            return docSnap.data().orders || [];
        } else {
            console.log(`Orders ${ordersId} not found`);
            return [];
        }
    } catch (error) {
        console.error(`Error fetching orders ${ordersId}:`, error);
        return [];
    }
}

export const saveOrdersData = async (ordersData, ordersId = 'order') => {
    try {
        const docRef = doc(firestore, 'MasterData', `orders_${ordersId}`);
        await setDoc(docRef, {
            orders: ordersData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log(`Orders ${ordersId} saved`);
        return true;
    } catch (error) {
        console.error(`Error saving orders ${ordersId}:`, error);
        throw error;
    }
}

// Stores Data
export const getStoresData = async (storesId = 'stores1') => {
    const decodeStore = (store) => {
        const locations = Array.isArray(store?.locations)
            ? store.locations.map((row) => {
                if (Array.isArray(row)) return row;
                if (row && Array.isArray(row.cells)) return row.cells;
                return [];
            })
            : [];
        return { ...store, locations };
    };

    const decodeStoresPayload = (payload) => {
        if (!payload) return payload;
        const stores = Array.isArray(payload.stores) ? payload.stores.map(decodeStore) : [];
        return { ...payload, stores };
    };

    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', `stores_${storesId}`));
        if (docSnap.exists()) {
            console.log(`Stores ${storesId} fetched`);
            const data = decodeStoresPayload(docSnap.data() || {});
            if (Array.isArray(data)) {
                return { stores: data };
            }
            if (Array.isArray(data.stores)) {
                return data;
            }
            return { stores: [] };
        } else {
            console.log(`Stores ${storesId} not found`);
            return null;
        }
    } catch (error) {
        if (error?.code === 'permission-denied') {
            console.warn(`Stores ${storesId} read blocked by Firestore rules.`);
        } else {
            console.error(`Error fetching stores ${storesId}:`, error);
        }
        return null;
    }
}

export const saveStoresData = async (storesData, storesId = 'stores1') => {
    const encodeStore = (store) => {
        const locations = Array.isArray(store?.locations)
            ? store.locations.map((row) => ({ cells: Array.isArray(row) ? row : [] }))
            : [];
        return { ...store, locations };
    };

    const encodeStoresPayload = (payload) => {
        const stores = Array.isArray(payload?.stores) ? payload.stores.map(encodeStore) : [];
        return { ...payload, stores };
    };

    try {
        const docRef = doc(firestore, 'MasterData', `stores_${storesId}`);
        const payload = Array.isArray(storesData) ? { stores: storesData } : storesData;
        const encodedPayload = encodeStoresPayload(payload);
        await setDoc(docRef, {
            ...encodedPayload,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log(`Stores ${storesId} saved`);
        return true;
    } catch (error) {
        console.error(`Error saving stores ${storesId}:`, error);
        throw error;
    }
}

// Emojis Data
export const getEmojisData = async () => {
    try {
        const docSnap = await getDoc(doc(firestore, 'MasterData', 'emojis'));
        if (docSnap.exists()) {
            console.log('Emojis fetched');
            return docSnap.data().emojis || {};
        } else {
            console.log('Emojis not found');
            return {};
        }
    } catch (error) {
        console.error('Error fetching emojis:', error);
        return {};
    }
}

export const saveEmojisData = async (emojisData) => {
    try {
        const docRef = doc(firestore, 'MasterData', 'emojis');
        await setDoc(docRef, {
            emojis: emojisData,
            updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('Emojis saved');
        return true;
    } catch (error) {
        console.error('Error saving emojis:', error);
        throw error;
    }
}
