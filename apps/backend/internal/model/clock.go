package model

import (
	"sync"
	"time"
)

type Clock struct {
	mu          sync.Mutex
	timeLeft    time.Duration
	lastStarted time.Time // When the clock was last started
	isRunning   bool
}

func NewClock(initialTime time.Duration) *Clock {
	return &Clock{
		timeLeft:  initialTime,
		isRunning: false,
	}
}

func (c *Clock) Start() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.isRunning {
		c.lastStarted = time.Now()
		c.isRunning = true
	}
}

func (c *Clock) Stop() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.isRunning {
		c.timeLeft -= time.Since(c.lastStarted)
		c.isRunning = false
	}
}
