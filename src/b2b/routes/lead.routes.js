const router = require('express').Router();
const {
  listLeads, getLead, createLead, updateLead, deleteLead, convertLead,
} = require('../controllers/lead.controller');

router.get('/', listLeads);
router.post('/', createLead);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.post('/:id/convert', convertLead);

module.exports = router;
