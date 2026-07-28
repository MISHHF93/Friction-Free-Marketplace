package com.frictionfreemarketplace.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class ApplicationConfigurationTest {
    @Test
    public void packageNameRemainsStable() {
        assertEquals("com.frictionfreemarketplace.app", BuildConfig.APPLICATION_ID);
    }
}
